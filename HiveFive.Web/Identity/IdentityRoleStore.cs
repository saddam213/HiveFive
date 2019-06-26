using Microsoft.AspNet.Identity.EntityFramework;

namespace HiveFive.Web.Identity
{
	public class IdentityRoleStore : RoleStore<IdentityRole, int, IdentityUserRole>
	{
		public IdentityRoleStore(IdentityDataContext context)
				: base(context)
		{
		}
	}
}