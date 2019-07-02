using System.Web.Mvc;
using System.Web.Script.Serialization;

namespace HiveFive.Web.ActionResults
{
	public class CloseModalResult : ActionResult
	{
		public CloseModalResult()
		{
		}

		public CloseModalResult(object data)
		{
			var serializer = new JavaScriptSerializer();
			JsonData = serializer.Serialize(data);
		}

		public string JsonData { get; set; }

		public override void ExecuteResult(ControllerContext context)
		{
			var response = context.HttpContext.Response;
			response.ContentType = "text/html";
			if (!string.IsNullOrEmpty(JsonData))
			{
				response.Write(@"<script>(function () { $.modal.close(" + JsonData + "); })();</script>");
			}
			else
			{
				response.Write(@"<script>(function () { $.modal.close(); })();</script>");
			}
		}
	}
}