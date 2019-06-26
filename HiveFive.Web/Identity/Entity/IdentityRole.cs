using Microsoft.AspNet.Identity.EntityFramework;

namespace HiveFive.Web.Identity
{
	public class IdentityRole : IdentityRole<int, IdentityUserRole>
	{
		public IdentityRole() { }
		public IdentityRole(string name) { Name = name; }
	}
}