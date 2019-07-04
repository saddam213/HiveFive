using System.Threading.Tasks;
using System.Web;
using hbehr.recaptcha;

namespace HiveFive.Web
{
	public static class CaptchaConfig
	{
		public static void RegisterCaptcha(string key, string secret)
		{
			ReCaptcha.Configure(key, secret);
		}

		public static Task<bool> ValidateCaptcha(string recaptchaResponse)
		{
#if !DEBUG
			if (string.IsNullOrEmpty(recaptchaResponse))
				return Task.FromResult(false);

			return ReCaptcha.ValidateCaptchaAsync(recaptchaResponse);
#else
			return Task.FromResult(true);
#endif
		}

		public static Task<bool> ValidateCaptcha(this HttpRequestBase request)
		{
			return ValidateCaptcha(request.Params["g-recaptcha-response"]);
		}
	}
}