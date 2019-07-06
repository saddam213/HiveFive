using System.Threading.Tasks;
using System.Web.Mvc;
using HiveFive.Core.Common.AccountSettings;
using HiveFive.Web.Identity;

namespace HiveFive.Web.Controllers
{
	[Authorize(Roles = "Admin")]
	public class AdminController : BaseController
	{
		public IAccountSettingsReader AccountSettingsReader { get; set; }

		public async Task<ActionResult> Index()
		{
			return View();
		}
	}
}