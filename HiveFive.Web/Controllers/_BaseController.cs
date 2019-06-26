using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using HiveFive.Web.ActionResults;

namespace HiveFive.Web.Controllers
{
	public class BaseController : Controller
	{
		protected override JsonResult Json(object data, string contentType, System.Text.Encoding contentEncoding, JsonRequestBehavior behavior)
		{
			return new JsonResult()
			{
				Data = data,
				ContentType = contentType,
				ContentEncoding = contentEncoding,
				JsonRequestBehavior = behavior,
				MaxJsonLength = Int32.MaxValue
			};
		}

		protected ActionResult JsonSuccess(string message = null)
		{
			var result = new JsonNetResult
			{
				Data = new { Success = true, Message = message }
			};
			return result;
		}

		protected ActionResult JsonError(string message = null)
		{
			var result = new JsonNetResult
			{
				Data = new { Success = false, Message = message }
			};
			return result;
		}

		protected ActionResult JsonResult(object data)
		{
			var result = new JsonNetResult
			{
				Data = data
			};
			return result;
		}

		public ViewResult Unauthorized()
		{
			return View("Unauthorized");
		}

		protected bool ViewExists(string name)
		{
			ViewEngineResult result = ViewEngines.Engines.FindView(ControllerContext, name, null);
			return (result.View != null);
		}
	}
}