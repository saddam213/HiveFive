using Microsoft.AspNet.Identity.EntityFramework;

namespace HiveFive.Web.Identity
{
	public class IdentityUserStore : UserStore<IdentityUser, IdentityRole, int,
			IdentityUserLogin, IdentityUserRole, IdentityUserClaim>
	{
		public IdentityUserStore(IdentityDataContext context)
				: base(context)
		{
		}
	}
}