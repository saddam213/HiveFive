using System;
using System.Threading.Tasks;
using System.Web.Mvc;
using HiveFive.Core.Common.Email;
using HiveFive.Core.Common.TwoFactor;
using HiveFive.Enums;
using HiveFive.Web.Extensions;
using HiveFive.Web.Identity;
using Microsoft.AspNet.Identity;

namespace HiveFive.Web.Controllers
{
	[Authorize]
	public class TwoFactorController : UserController
	{
		public IEmailService EmailService { get; set; }

		#region Create

		[HttpGet]
		[Authorize]
		public async Task<ActionResult> Create()
		{
			var user = await UserManager.FindByIdAsync(User.Identity.GetId());
			if (user == null)
				return Unauthorized();

			if (user.TwoFactorType != TwoFactorType.None)
				return RedirectToAction("Remove");

			return View(new CreateTwoFactorModel
			{
				OtpData = IdentityTwoFactorHelper.GenerateOtpKey(),
			});
		}

		[HttpPost]
		[Authorize]
		[ValidateAntiForgeryToken]
		public async Task<ActionResult> Create(CreateTwoFactorModel model)
		{
			var user = UserManager.FindById(User.Identity.GetId());
			if (user == null)
				return Unauthorized();

			Validate(ModelState, model, user);
			if (!ModelState.IsValid)
				return View("Create", model);

			// If twofactor exists something is dodgy, return unauthorised
			if (user.TwoFactorType != TwoFactorType.None)
				return RedirectToAction("Index", "AccountSettings");

			SetTwoFactorValues(model, user);
			await UserManager.UpdateAsync(user);
			return RedirectToAction("Index", "AccountSettings");
		}

		#endregion

		#region Remove

		[HttpGet]
		[Authorize]
		public async Task<ActionResult> Remove()
		{
			var user = UserManager.FindById(User.Identity.GetId());
			if (user == null)
				return Unauthorized();

			if (user.TwoFactorType == TwoFactorType.EmailCode)
			{
				var twofactorCode = await UserManager.GenerateTwoFactorCodeAsync(user.Id);
				if (!await EmailService.SendEmail(EmailTemplateType.TwoFactorRemove, user.Id, user.Email, Request.GetIPAddress(), user.UserName, twofactorCode))
				{
					return View("Error",Resources.TwoFactor.ErrorMessageTitleSendEmail, Resources.TwoFactor.ErrorMessageTextSendEmail);
				}
			}

			var model = new RemoveTwoFactorModel
			{
				Type = user.TwoFactorType
			};
			return View("Remove", model);
		}

		[HttpPost]
		[Authorize]
		[ValidateAntiForgeryToken]
		public async Task<ActionResult> Remove(RemoveTwoFactorModel model)
		{
			if (!ModelState.IsValid)
				return View("Remove", model);

			var user = UserManager.FindById(User.Identity.GetId());
			if (user == null)
				return Unauthorized();

			if (user.TwoFactorType == TwoFactorType.None)
				return RedirectToAction("Index", "AccountSettings");

			if (!await UserManager.CheckTwoFactorAsync(user, model.Data))
			{
				// failed to validate last TFA
				ModelState.AddModelError("Data", Resources.TwoFactor.InvalidTwoFactorText);
				return View("Remove", model);
			}

			// Delete TFA
			user.TwoFactorType = TwoFactorType.None;
			//twofactor.Updated = DateTime.UtcNow;

			await UserManager.UpdateAsync(user);
			return RedirectToAction("Create");
		}

		#endregion

		#region Helpers

		[HttpPost]
		[Authorize]
		public async Task<ActionResult> SendEmailCode(string dataEmail)
		{
			var user = UserManager.FindById(User.Identity.GetId());
			if (user == null)
				return JsonError("Unauthorized");

			if (!ValidationExtensions.IsValidEmailAddress(dataEmail))
				return JsonError(string.Format(Resources.TwoFactor.ErrorMessageInvalidEmail, dataEmail));

			var twofactorCode = await UserManager.GenerateTwoFactorCodeAsync(User.Identity.GetId());
			if (await EmailService.SendEmail(EmailTemplateType.TwoFactorSetup, user.Id, dataEmail, Request.GetIPAddress(), user.UserName, twofactorCode))
				return JsonSuccess();

			return JsonError();
		}

		[HttpPost]
		[Authorize]
		public async Task<ActionResult> SendUnlockTwoFactorCode(EmailTemplateType emailType)
		{
			var user = UserManager.FindById(User.Identity.GetId());
			if (user == null)
				return JsonError("Unauthorized");

			if (user.TwoFactorType == TwoFactorType.None)
				return JsonError("Unauthorized");

			var email = user.TwoFactorPublicKey;
			var twofactorCode = await UserManager.GenerateTwoFactorCodeAsync(User.Identity.GetId());
			if (await EmailService.SendEmail(emailType, user.Id, email, Request.GetIPAddress(), user.UserName, twofactorCode))
				return JsonSuccess();

			return JsonError();
		}

		[HttpPost]
		[Authorize]
		public async Task<ActionResult> VerifyEmailCode(string code)
		{
			var user = UserManager.FindById(User.Identity.GetId());
			if (user == null)
				return JsonError("Unauthorized");

			if (await UserManager.VerifyTwoFactorCodeAsync(user.Id, code))
			{
				return JsonSuccess();
			}
			return JsonError();
		}

		[HttpPost]
		[Authorize]
		public ActionResult VerifyOtpCode(string key, string code)
		{
			return IdentityTwoFactorHelper.VerifyOtpCode(key, code) ? JsonSuccess() : JsonError();
		}

		private void SetTwoFactorValues(CreateTwoFactorModel model, IdentityUser entity)
		{
			entity.TwoFactorType = model.Type;
			if (model.Type == TwoFactorType.EmailCode)
			{
				entity.TwoFactorPublicKey = model.DataEmail;
			}
			else if (model.Type == TwoFactorType.PinCode)
			{
				entity.TwoFactorPublicKey = model.DataPin;
			}
			else if (model.Type == TwoFactorType.OtpCode)
			{
				entity.TwoFactorPublicKey = model.OtpData;
			}
		}

		private void Validate(ModelStateDictionary modelstate, CreateTwoFactorModel model, IdentityUser user)
		{
			if (model.Type == TwoFactorType.EmailCode)
			{
				if (string.IsNullOrEmpty(model.DataEmail))
					modelstate.AddModelError("DataEmail", Resources.TwoFactor.ErrorMessageEmailRequired);

				if (model.DataEmail.Equals(user.Email, StringComparison.OrdinalIgnoreCase))
					ModelState.AddModelError("DataEmail", Resources.TwoFactor.ErrorMessageEmailNotAllowed);

				if (!ValidationExtensions.IsValidEmailAddress(model.DataEmail))
					modelstate.AddModelError("DataEmail", string.Format(Resources.TwoFactor.ErrorMessageInvalidEmail, model.DataEmail));
			}
			else if (model.Type == TwoFactorType.OtpCode)
			{
				if (string.IsNullOrEmpty(model.OtpData))
					modelstate.AddModelError("", Resources.TwoFactor.ErrorMessageOtpUnknown);
			}
			else if (model.Type == TwoFactorType.PinCode)
			{
				if (model.DataPin.Length < 4 || model.DataPin.Length > 8)
					modelstate.AddModelError("DataPin", Resources.TwoFactor.ErrorMessagePinValidation);
			}
		}

		#endregion
	}
}