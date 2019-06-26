using Base32;
using OtpSharp;
using System;

namespace HiveFive.Web.Identity
{
	public static class IdentityTwoFactorHelper
	{
		public static string GenerateOtpKey()
		{
			try
			{
				var secretKey = KeyGeneration.GenerateRandomKey(20);
				return Base32Encoder.Encode(secretKey);
			}
			catch (Exception)
			{
				return string.Empty;
			}
		}

		public static bool VerifyOtpCode(string privateKey, string code)
		{
			try
			{
				var otp = new Totp(Base32Encoder.Decode(privateKey));
				return otp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);
			}
			catch (Exception)
			{
				return false;
			}
		}
	}
}
