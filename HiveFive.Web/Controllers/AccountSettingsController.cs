using System.Threading.Tasks;
using System.Web.Mvc;
using HiveFive.Core.Common.AccountSettings;
using HiveFive.Web.Identity;

namespace HiveFive.Web.Controllers
{
	[Authorize]
	public class AccountSettingsController : BaseController
	{
		public IAccountSettingsReader AccountSettingsReader { get; set; }

		public async Task<ActionResult> Index()
		{
			return View(await AccountSettingsReader.GetAccountSettings(User.Identity.GetId()));
		}
	}
}