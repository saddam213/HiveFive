using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using HiveFive.Framework.Extensions;

namespace HiveFive.Web.Extensions
{
	public static class ResourceExtensions
	{
		public static MvcHtmlString FormatResource(this HtmlHelper helper, string resource, params object[] formatparams)
		{
			if (string.IsNullOrEmpty(resource))
				return MvcHtmlString.Empty;

			var result = resource;
			try
			{
				result = string.Format(resource, formatparams);
			}
			catch { }
			return MvcHtmlString.Create(result);
		}

		public static MvcHtmlString CurrentThreadCulture(this HtmlHelper helper)
		{
			return MvcHtmlString.Create(ResourceConfig.CurrentCulture);
		}

		public static MvcHtmlString CurrentThreadCultureName(this HtmlHelper helper)
		{
			return MvcHtmlString.Create(ResourceConfig.CurrentCultureName);
		}

		public static MvcHtmlString EnumDisplayName(this HtmlHelper helper, System.Enum enumValue)
		{
			return MvcHtmlString.Create(enumValue.GetDisplayName());
		}
	}
}