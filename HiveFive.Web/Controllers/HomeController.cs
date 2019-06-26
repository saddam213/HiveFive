using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using HiveFive.Core.Common.AccountSettings;
using HiveFive.Core.Common.Email;
using HiveFive.Web.Identity;

namespace HiveFive.Web.Controllers
{
	public class HomeController : Controller
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