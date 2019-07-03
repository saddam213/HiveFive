using System.Globalization;
using System.Threading.Tasks;
using System.Web.Mvc;
using HiveFive.Core.Common.AccountSettings;
using HiveFive.Web.Identity;

namespace HiveFive.Web.Controllers
{
	public class HomeController : BaseController
	{
		public IAccountSettingsWriter AccountSettingsWriter { get; set; }

		public ActionResult Index()
		{
			return View();
		}

		[HttpGet]
		[AllowAnonymous]
		public async Task<ActionResult> SetLanguage(string lang)
		{
			ResourceConfig.SetCookie(HttpContext.ApplicationInstance.Context, lang);
			if (User.Identity.IsAuthenticated)
			{
				var culture = CultureInfo.CreateSpecificCulture(lang);
				await AccountSettingsWriter.UpdateLanguage(User.Identity.GetId(), culture.Name);
			}
			// return to referrer page or redirect to home
			if (HttpContext.Request.UrlReferrer != null)
				return Redirect(HttpContext.Request.UrlReferrer.ToString());
			else
				return RedirectToAction("");
		}
	}
}