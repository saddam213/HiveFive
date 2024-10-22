﻿using System;
using System.Web;
using System.Web.Mvc;
using HiveFive.Web.ActionResults;
using HiveFive.Web.Identity;
using Microsoft.AspNet.Identity.Owin;

namespace HiveFive.Web.Controllers
{
	public class UserController : BaseController
	{
		private IdentityUserManager _userManager;
		public UserController() { }
		public UserController(IdentityUserManager userManager)
		{
			UserManager = userManager;
		}

		public IdentityUserManager UserManager
		{
			get { return _userManager ?? HttpContext.GetOwinContext().GetUserManager<IdentityUserManager>(); }
			private set { _userManager = value; }
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
	}

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

		protected CloseModalResult CloseModal()
		{
			return new CloseModalResult();
		}

		protected CloseModalResult CloseModal(object data)
		{
			return new CloseModalResult(data);
		}

		protected CloseModalResult CloseModalSuccess(string message = null)
		{
			return new CloseModalResult(new { Success = true, Message = message });
		}

		protected CloseModalResult CloseModalError(string message = null)
		{
			return new CloseModalResult(new { Success = false, Message = message });
		}
	}
}