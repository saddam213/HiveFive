using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Web;

namespace HiveFive.Web
{
	public static class ResourceConfig
	{
		private static string _cookieName;
		public static Dictionary<string, string> EnabledLanguages;
		private static Dictionary<string, string> SupportedLanguages = new Dictionary<string, string>() {
			{ "en-US", "English" },
			{ "es-ES", "Español"}
		};

		public static string CurrentCulture
		{
			get { return Thread.CurrentThread.CurrentUICulture.Name; }
		}

		public static string CurrentCultureName
		{
			get { return EnabledLanguages[CurrentCulture]; }
		}

		public static bool IsValidName(string lang)
		{
			return EnabledLanguages.ContainsKey(lang);
		}

		public static void SetCookie(HttpContext context, string lang)
		{
			if (IsValidName(lang))
			{
				var cookie = new HttpCookie(_cookieName);
				cookie.Values.Add("lang", lang);
				cookie.Expires = DateTime.Now.AddYears(1);
				context.Response.Cookies.Add(cookie);
			}
		}

		public static void Init(string cookieName, string enabledLanguages)
		{
			enabledLanguages = enabledLanguages ?? "";
			var list = enabledLanguages
				.Split(',')
				.Where(l => l.Trim() != "")
				.Select(l => l.Trim())
				.ToArray();

			Init(cookieName, list);
		}

		private static void Init(string cookieName, string[] enabledLanguages)
		{
			_cookieName = cookieName;
			enabledLanguages = enabledLanguages ?? new string[] { };
			EnabledLanguages = SupportedLanguages
				.Where(l => enabledLanguages.Contains(l.Key))
				.ToDictionary(l => l.Key, l => l.Value);
		}

		public static void InitRequest(HttpContext context)
		{
			if (EnabledLanguages.Count == 0)
				return;

			string cultureName = null;
			var cultureCookie = context.Request.Cookies[_cookieName];
			if (cultureCookie != null && IsValidName(cultureCookie["lang"]))
				cultureName = cultureCookie["lang"];

			// or from http header (browser preferences)
			if (cultureName == null && context.Request.UserLanguages != null)
			{
				foreach (var lang in context.Request.UserLanguages)
				{
					var name = lang.ToLower();
					if (IsValidName(name))
					{
						cultureName = name;
						break;
					}
				}
			}

			// or default
			if (cultureName == null)
			{
				cultureName = EnabledLanguages.FirstOrDefault().Key;
			}

			// (re)set cookie 
			if (cultureCookie == null || cultureCookie.Value != cultureName || cultureCookie.Expires.AddMonths(1) > DateTime.Now)
			{
				SetCookie(context, cultureName);
			}

			// set response header
			context.Response.AddHeader("Content-language", cultureName);

			var culture = CultureInfo.CreateSpecificCulture(cultureName);
			//	Thread.CurrentThread.CurrentCulture = culture;
			Thread.CurrentThread.CurrentUICulture = culture;
		}
	}
}