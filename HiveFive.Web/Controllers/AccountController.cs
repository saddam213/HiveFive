using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using HiveFive.Core.Common.Account;
using HiveFive.Core.Common.Email;
using HiveFive.Core.Common.Logon;
using HiveFive.Enums;
using HiveFive.Framework.Extensions;
using HiveFive.Web.Extensions;
using HiveFive.Web.Identity;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.Owin;
using Microsoft.Owin.Security;

namespace HiveFive.Web.Controllers
{
	[Authorize]
	public class AccountController : Controller
	{
		private IdentityUserManager _userManager;

		public AccountController()
		{
		}

		public AccountController(IdentityUserManager userManager)
		{
			UserManager = userManager;
		}

		public IdentityUserManager UserManager
		{
			get
			{
				return _userManager ?? HttpContext.GetOwinContext().GetUserManager<IdentityUserManager>();
			}
			private set
			{
				_userManager = value;
			}
		}

		public IEmailService EmailService { get; set; }
		public ILogonWriter LogonWriter { get; set; }

		[AllowAnonymous]
		public ActionResult Login(string returnUrl)
		{
			ViewBag.ReturnUrl = returnUrl;
			return View();
		}

		[HttpPost]
		[AllowAnonymous]
		[ValidateAntiForgeryToken]
		public async Task<ActionResult> Login(LoginViewModel model, string returnUrl)
		{
			//if (!CaptchaHelper.Validate())
			//{
			//	ModelState.AddModelError("", Resources.Login.LoginErrorMessageInvalidCaptcha);
			//	return View(model);
			//}

			if (!ModelState.IsValid)
			{
				return View(model);
			}

			// Check User
			var user = await UserManager.FindByEmailAsync(model.Email);
			if (user == null || !user.IsEnabled)
			{
				ModelState.AddModelError("", Resources.Account.LoginErrorMessageInvalidEmailPassword);
				return View(model);
			}

			// Check verified
			if (!await UserManager.IsEmailConfirmedAsync(user.Id))
			{
				ModelState.AddModelError("", Resources.Account.LoginErrorMessageEmailNotVerified);
				return View(model);
			}

			// Check is locked out
			if (await UserManager.IsLockedOutAsync(user.Id))
			{
				ModelState.AddModelError("", string.Format(Resources.Account.LoginErrorMessageAccountLocked, GetLockoutExpireTime(user)));
				return View(model);
			}

			// Check password
			if (!await UserManager.CheckPasswordAsync(user, model.Password))
			{
				await RecordLoginAttempt(user.Id, LogonType.LoginPasswordFailed);
				await IncrementAccessFailedCount(user, Resources.Account.LoginErrorMessageInvalidEmailPassword);
				return View(model);
			}

			// Check two factor
			if (user.TwoFactorType != TwoFactorType.None)
			{
				SetTwoFactorLoginAuthCookie(user.Id);
				if (!string.IsNullOrEmpty(user.TwoFactorRecoveryCode))
				{
					return RedirectToAction(nameof(ResetTwoFactor), new { ReturnUrl = returnUrl });
				}

				if (user.TwoFactorType == TwoFactorType.EmailCode)
				{
					var code = await UserManager.GenerateTwoFactorCodeAsync(user.Id);
					await SendEmailAsync(EmailTemplateType.TwoFactorLogin, user.TwoFactorPublicKey, user.Id, Request.GetIPAddress(), user.UserName, code);
				}
				return RedirectToAction(nameof(VerifyTwoFactor), new { ReturnUrl = returnUrl });
			}

			// Reset failed attempts
			await UserManager.ResetAccessFailedCountAsync(user.Id);

			// Sign user in
			await SignInAsync(user);
			if (string.IsNullOrEmpty(returnUrl))
			{
				return RedirectToAction("Index", "Home");
			}
			return RedirectToLocal(returnUrl);
		}


		[HttpGet]
		[AllowAnonymous]
		public async Task<ActionResult> VerifyTwoFactor(string returnUrl)
		{
			var userid = await GetTwoFactorLoginUserIdAsync();
			if (!userid.HasValue)
			{
				return RedirectToAction(nameof(Login));
			}

			var user = await UserManager.FindByIdAsync(userid.Value);
			if (user == null)
			{
				return View("Error");
			}

			return View(new VerifyTwoFactorModel
			{
				Type = user.TwoFactorType,
				ReturnUrl = returnUrl
			});
		}

		[HttpPost]
		[AllowAnonymous]
		public async Task<ActionResult> VerifyTwoFactor(VerifyTwoFactorModel model)
		{
			//if (!CaptchaHelper.Validate())
			//{
			//	ModelState.AddModelError("", Resources.Login.LoginErrorMessageInvalidCaptcha);
			//	return View(model);
			//}

			if (!ModelState.IsValid)
			{
				return View(model);
			}

			var userId = await GetTwoFactorLoginUserIdAsync();
			if (!userId.HasValue)
			{
				return View("Error");
			}

			var user = await UserManager.FindByIdAsync(userId.Value);
			if (user == null)
			{
				return View("Error");
			}

			if (await UserManager.IsLockedOutAsync(user.Id))
			{
				ModelState.AddModelError("", string.Format(Resources.Account.LoginErrorMessageAccountLocked, GetLockoutExpireTime(user)));
				return View(nameof(Login), new LoginViewModel());
			}

			if (!await UserManager.CheckTwoFactorAsync(user, model.SecurityCode))
			{
				await RecordLoginAttempt(user.Id, LogonType.LoginTwoFactorFailed);
				await IncrementAccessFailedCount(user, Resources.Account.LoginErrorMessageInvalidTwoFactor);
				return View(model);
			}

			// Invalidate the temp cookie
			AuthenticationManager.SignOut(DefaultAuthenticationTypes.TwoFactorCookie);
			await SignInAsync(user);

			return RedirectToLocal(model.ReturnUrl);
		}



		[HttpGet]
		[AllowAnonymous]
		public async Task<ActionResult> ResetTwoFactor(string returnUrl)
		{
			var userid = await GetTwoFactorLoginUserIdAsync();
			if (!userid.HasValue)
				return RedirectToAction(nameof(Login));

			var user = await UserManager.FindByIdAsync(userid.Value);
			if (user == null)
				return View("Error");

			return View(new ResetTwoFactorModel { ReturnUrl = returnUrl });
		}

		[HttpPost]
		[AllowAnonymous]
		[ValidateAntiForgeryToken]
		public async Task<ActionResult> ResetTwoFactor(ResetTwoFactorModel model)
		{
			//if (!CaptchaHelper.Validate())
			//{
			//	ModelState.AddModelError("", Resources.Login.LoginErrorMessageInvalidCaptcha);
			//	return View(model);
			//}

			if (!ModelState.IsValid)
				return View(model);

			var userid = await GetTwoFactorLoginUserIdAsync();
			if (!userid.HasValue)
				return RedirectToAction(nameof(Login));

			var user = await UserManager.FindByIdAsync(userid.Value);
			if (user == null || string.IsNullOrEmpty(user.TwoFactorRecoveryCode))
				return RedirectToAction(nameof(Login));

			if (!user.TwoFactorRecoveryCode.Equals(model.RecoveryCode))
			{
				ModelState.AddModelError("", Resources.Account.ResetTwoFactorErrorMessageInvalidCode);
				return View(model);
			}

			user.TwoFactorPublicKey = null;
			user.TwoFactorPrivateKey = null;
			user.TwoFactorRecoveryCode = null;
			user.TwoFactorType = TwoFactorType.None;
			await UserManager.UpdateAsync(user);

			// Invalidate the temp cookie
			AuthenticationManager.SignOut(DefaultAuthenticationTypes.TwoFactorCookie);
			await SignInAsync(user);

			return RedirectToAction("Create", "TwoFactor");
		}









		[AllowAnonymous]
		public ActionResult Register()
		{
			return View();
		}

		[HttpPost]
		[AllowAnonymous]
		[ValidateAntiForgeryToken]
		public async Task<ActionResult> Register(RegisterViewModel model)
		{
			//if (!CaptchaHelper.Validate())
			//{
			//	ModelState.AddModelError("", Resources.Login.RegisterErrorMessageInvalidCaptcha);
			//	return View(model);
			//}

			if (!ModelState.IsValid)
			{
				return View(model);
			}

			var existing = await UserManager.FindByNameAsync(model.UserName);
			if (existing != null)
			{
				ModelState.AddModelError("", string.Format(Resources.Account.RegisterErrorMessageUserNameExists, model.UserName));
				return View(model);
			}

			var baseEmail = model.Email.Split('@');
			if (baseEmail.Any() && baseEmail.Length == 2)
			{
				var cleanEmail = $"{baseEmail[0].Replace(".", "")}@{baseEmail[1]}";
				var existingEmail = await UserManager.FindByEmailAsync(cleanEmail);
				if (existingEmail != null)
				{
					ModelState.AddModelError("", string.Format(Resources.Account.RegisterErrorMessageEmailExists, model.Email));
					return View(model);
				}
			}

			var user = new IdentityUser
			{
				IsEnabled = true,
				UserName = model.UserName,
				Email = model.Email,
				Registered = DateTime.UtcNow,
				Culture = Thread.CurrentThread.CurrentUICulture.Name,
				Avatar = "Avatar.png"
			};

			ResourceConfig.SetCookie(HttpContext.ApplicationInstance.Context, user.Culture);
			var result = await UserManager.CreateAsync(user, model.Password);
			if (result.Succeeded)
			{
				var code = await UserManager.GenerateEmailConfirmationTokenAsync(user.Id);
				var callbackUrl = Url.Action(nameof(RegisterConfirmEmail), "Login", new { userId = user.Id, code }, protocol: Request.Url?.Scheme);
				if (await SendEmailAsync(EmailTemplateType.Registration, user.Email, user.Id, Request.GetIPAddress(), user.UserName, callbackUrl))
				{
					return View("RegisterSuccess");
				}

				ModelState.AddModelError("", Resources.Account.RegisterErrorMessageConfirmEmailSendFail);
			}

			AddErrors(result);
			return View(model);
		}

		//
		// GET: /Account/ConfirmEmail
		[AllowAnonymous]
		public async Task<ActionResult> RegisterConfirmEmail(int userId, string code)
		{
			if (userId > 0 || code == null)
			{
				return View("Error");
			}
			var result = await UserManager.ConfirmEmailAsync(userId, code);
			return View(result.Succeeded ? "ConfirmEmail" : "Error");
		}

		[HttpGet]
		[AllowAnonymous]
		public ActionResult ForgotPassword()
		{
			return View();
		}

		[HttpPost]
		[AllowAnonymous]
		[ValidateAntiForgeryToken]
		public async Task<ActionResult> ForgotPassword(ForgotPasswordViewModel model)
		{
			//if (!CaptchaHelper.Validate())
			//{
			//	ModelState.AddModelError("", Resources.Login.ForgotPasswordErrorMessageInvalidCaptcha);
			//	return View(model);
			//}

			if (!ModelState.IsValid)
			{
				return View(model);
			}

			var user = await UserManager.FindByEmailAsync(model.Email);
			if (user == null || !(await UserManager.IsEmailConfirmedAsync(user.Id)) || !user.IsEnabled)
			{
				// Don't reveal that the user does not exist or is not confirmed
				return RedirectToAction(nameof(ForgotPasswordConfirmation));
			}

			var resetPasswordToken = Url.Action(nameof(ResetPassword), "Login", new { code = await UserManager.GeneratePasswordResetTokenAsync(user.Id) }, protocol: Request.Url?.Scheme);
			await SendEmailAsync(EmailTemplateType.PasswordReset, user.Email, user.Id, Request.GetIPAddress(), user.UserName, resetPasswordToken);
			return RedirectToAction(nameof(ForgotPasswordConfirmation));
		}

		//
		// GET: /Account/ForgotPasswordConfirmation
		[AllowAnonymous]
		public ActionResult ForgotPasswordConfirmation()
		{
			return View();
		}

		//
		// GET: /Account/ResetPassword
		[AllowAnonymous]
		public ActionResult ResetPassword(string code)
		{
			return code == null ? View("Error") : View();
		}

		//
		// POST: /Account/ResetPassword
		[HttpPost]
		[AllowAnonymous]
		[ValidateAntiForgeryToken]
		public async Task<ActionResult> ResetPassword(ResetPasswordViewModel model)
		{
			if (!ModelState.IsValid)
			{
				return View(model);
			}

			var user = await UserManager.FindByNameAsync(model.Email);
			if (user == null)
			{
				// Don't reveal that the user does not exist
				return RedirectToAction(nameof(ResetPasswordConfirmation));
			}
			var result = await UserManager.ResetPasswordAsync(user.Id, model.Code, model.Password);
			if (result.Succeeded)
			{
				return RedirectToAction(nameof(ResetPasswordConfirmation));
			}
			AddErrors(result);
			return View();
		}

		//
		// GET: /Account/ResetPasswordConfirmation
		[AllowAnonymous]
		public ActionResult ResetPasswordConfirmation()
		{
			return View();
		}



		//
		// POST: /Account/LogOff
		[HttpPost]
		[ValidateAntiForgeryToken]
		public ActionResult LogOff()
		{
			AuthenticationManager.SignOut(DefaultAuthenticationTypes.ApplicationCookie);
			return RedirectToAction("Index", "Home");
		}


		////
		//// GET: /Manage/ChangePassword
		//public ActionResult ChangePassword()
		//{
		//	return View();
		//}

		////
		//// POST: /Manage/ChangePassword
		//[HttpPost]
		//[ValidateAntiForgeryToken]
		//public async Task<ActionResult> ChangePassword(ChangePasswordViewModel model)
		//{
		//	if (!ModelState.IsValid)
		//	{
		//		return View(model);
		//	}
		//	var result = await UserManager.ChangePasswordAsync(User.Identity.GetId(), model.OldPassword, model.NewPassword);
		//	if (result.Succeeded)
		//	{
		//		var user = await UserManager.FindByIdAsync(User.Identity.GetId());
		//		if (user != null)
		//		{
		//			await SignInAsync(user);
		//		}
		//		return RedirectToAction("Index", new { Message = "Change Password Success" });
		//	}
		//	AddErrors(result);
		//	return View(model);
		//}


		private async Task SignInAsync(IdentityUser user)
		{
			AuthenticationManager.SignOut(DefaultAuthenticationTypes.ExternalCookie, DefaultAuthenticationTypes.ApplicationCookie, DefaultAuthenticationTypes.TwoFactorCookie);
			var identity = await user.GenerateUserIdentityAsync(UserManager);
			AuthenticationManager.SignIn(new AuthenticationProperties { IsPersistent = true }, identity);

			// Log IP address
			await RecordLoginAttempt(user.Id, LogonType.LoginSuccess);
			ResourceConfig.SetCookie(HttpContext.ApplicationInstance.Context, user.Culture);
		}

		private void SetTwoFactorLoginAuthCookie(int userId)
		{
			var identity = new ClaimsIdentity(DefaultAuthenticationTypes.TwoFactorCookie);
			identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, userId.ToString()));
			AuthenticationManager.SignIn(identity);
		}

		private async Task<int?> GetTwoFactorLoginUserIdAsync()
		{
			var result = await AuthenticationManager.AuthenticateAsync(DefaultAuthenticationTypes.TwoFactorCookie);
			if (result?.Identity != null && !string.IsNullOrEmpty(result.Identity.GetUserId()))
			{
				return result.Identity.GetId();
			}
			return null;
		}

		private async Task IncrementAccessFailedCount(IdentityUser user, string message)
		{
			await UserManager.AccessFailedAsync(user.Id);
			if (await UserManager.IsLockedOutAsync(user.Id))
			{
				ModelState.AddModelError("", string.Format(Resources.Account.LoginErrorMessageAccountLockout, GetLockoutExpireTime(user), UserManager.MaxFailedAccessAttemptsBeforeLockout));
				return;
			}
			ModelState.AddModelError("", message);
		}

		private static string GetLockoutExpireTime(IdentityUser user)
		{
			return user.LockoutEndDateUtc.HasValue
						? (user.LockoutEndDateUtc.Value - DateTime.UtcNow).ToReadableString()
						: TimeSpan.FromHours(24).ToReadableString();
		}

		private Task<bool> SendEmailAsync(EmailTemplateType type, string destination, int userid, params object[] formatParameters)
		{
			return EmailService.SendEmail(type, userid, destination, formatParameters);
		}

		private Task RecordLoginAttempt(int userId, LogonType type)
		{
			// Log IP address
			return LogonWriter.AddLogon(new AddLogonModel
			{
				UserId = userId,
				IPAddress = Request.GetIPAddress(),
				UserAgent = Request.UserAgent,
				Location = Request.GetLocation(),
				Device = Request.GetDevice(),
				Type = type
			});
		}

		protected override void Dispose(bool disposing)
		{
			if (disposing)
			{
				if (_userManager != null)
				{
					_userManager.Dispose();
					_userManager = null;
				}
			}

			base.Dispose(disposing);
		}

		#region Helpers
		// Used for XSRF protection when adding external logins
		private const string XsrfKey = "XsrfId";

		private IAuthenticationManager AuthenticationManager
		{
			get
			{
				return HttpContext.GetOwinContext().Authentication;
			}
		}

		private void AddErrors(IdentityResult result)
		{
			foreach (var error in result.Errors)
			{
				ModelState.AddModelError("", error);
			}
		}

		private ActionResult RedirectToLocal(string returnUrl)
		{
			if (Url.IsLocalUrl(returnUrl))
			{
				return Redirect(returnUrl);
			}
			return RedirectToAction("Index", "Home");
		}

		internal class ChallengeResult : HttpUnauthorizedResult
		{
			public ChallengeResult(string provider, string redirectUri)
					: this(provider, redirectUri, null)
			{
			}

			public ChallengeResult(string provider, string redirectUri, string userId)
			{
				LoginProvider = provider;
				RedirectUri = redirectUri;
				UserId = userId;
			}

			public string LoginProvider { get; set; }
			public string RedirectUri { get; set; }
			public string UserId { get; set; }

			public override void ExecuteResult(ControllerContext context)
			{
				var properties = new AuthenticationProperties { RedirectUri = RedirectUri };
				if (UserId != null)
				{
					properties.Dictionary[XsrfKey] = UserId;
				}
				context.HttpContext.GetOwinContext().Authentication.Challenge(properties, LoginProvider);
			}
		}
		#endregion
	}
}