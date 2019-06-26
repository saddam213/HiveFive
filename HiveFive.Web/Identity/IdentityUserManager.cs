using System;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.Owin;
using Microsoft.Owin;
using System.Threading.Tasks;
using HiveFive.Framework.Extensions;
using HiveFive.Core.Common;
using HiveFive.Enums;

namespace HiveFive.Web.Identity
{
	// Configure the application user manager used in this application. UserManager is defined in ASP.NET Identity and is used by the application.
	public class IdentityUserManager : UserManager<IdentityUser, int>
	{
		private static readonly string TWOFACTOR_PROVIDER_TOTP = "TotpCode";

		public IdentityUserManager(IUserStore<IdentityUser, int> store)
				: base(store)
		{
		}

		public static IdentityUserManager Create(IdentityFactoryOptions<IdentityUserManager> options, IOwinContext context)
		{
			var manager = new IdentityUserManager(new IdentityUserStore(context.Get<IdentityDataContext>()));
			// Configure validation logic for usernames
			manager.UserValidator = new UserValidator<IdentityUser, int>(manager)
			{
				AllowOnlyAlphanumericUserNames = false,
				RequireUniqueEmail = true
			};

			// Configure validation logic for passwords
			manager.PasswordValidator = new PasswordValidator
			{
				RequiredLength = 6,
				RequireNonLetterOrDigit = true,
				RequireDigit = true,
				RequireLowercase = true,
				RequireUppercase = true,
			};

			// Configure user lockout defaults
			manager.UserLockoutEnabledByDefault = true;
			manager.DefaultAccountLockoutTimeSpan = TimeSpan.FromMinutes(5);
			manager.MaxFailedAccessAttemptsBeforeLockout = 5;

			manager.RegisterTwoFactorProvider(TWOFACTOR_PROVIDER_TOTP, new TotpSecurityStampBasedTokenProvider<IdentityUser, int>());

			var dataProtectionProvider = options.DataProtectionProvider;
			if (dataProtectionProvider != null)
			{
				manager.UserTokenProvider = new DataProtectorTokenProvider<IdentityUser, int>(dataProtectionProvider.Create("Identity_TokenProvider"));
			}
			return manager;
		}

		public Task<string> GenerateTwoFactorCodeAsync(int userId)
		{
			return GenerateTwoFactorTokenAsync(userId, TWOFACTOR_PROVIDER_TOTP);
		}

		public Task<bool> VerifyTwoFactorCodeAsync(int userId, string token)
		{
			return VerifyTwoFactorTokenAsync(userId, TWOFACTOR_PROVIDER_TOTP, token);
		}

		public Task InvalidateTwoFactorCodeAsync(int userId)
		{
			return UpdateSecurityStampAsync(userId);
		}

		public Task<bool> CheckTwoFactorAsync(IdentityUser user, string twoFactorCode)
		{
			if (user == null)
				return Task.FromResult(false);

			return CheckTwoFactorAsync(user.Id, user.TwoFactorType, user.TwoFactorPublicKey, twoFactorCode);
		}

		public Task<bool> CheckTwoFactorAsync(int userId, TwoFactorType twoFactorType, string twoFactorKey, string twoFactorCode)
		{
			if (twoFactorType == TwoFactorType.None)
				return Task.FromResult(true);

			if (twoFactorType == TwoFactorType.PinCode)
				return Task.FromResult(twoFactorCode.IsDigits() && twoFactorCode.Equals(twoFactorKey));

			if (twoFactorType == TwoFactorType.EmailCode)
				return VerifyTwoFactorCodeAsync(userId, twoFactorCode);

			if (twoFactorType == TwoFactorType.OtpCode)
				return Task.FromResult(IdentityTwoFactorHelper.VerifyOtpCode(twoFactorKey, twoFactorCode));

			return Task.FromResult(false);
		}

		public Task<string> GenerateTwoFactorTokenAsync(TwoFactorTokenType tokenType, int userid)
		{
			return GenerateUserTokenAsync(tokenType.ToString(), userid);
		}

		public async Task<bool> VerifyTwoFactorTokenAsync(TwoFactorTokenType tokenType, int userid, string token, bool updateSecurityStamp = false)
		{
			if (await VerifyUserTokenAsync(userid, tokenType.ToString(), token))
			{
				// update security stamp, this will invalidate any other tokens
				if (updateSecurityStamp)
				{
					await UpdateSecurityStampAsync(userid);
				}
				return true;
			}
			return false;
		}


	}
}
