using Microsoft.AspNet.Identity;
using System.Security.Principal;

namespace HiveFive.Web.Identity
{
	public static class IdentityExtensions
	{
		public static int GetId(this IIdentity identity)
		{
			int.TryParse(identity.GetUserId(), out int result);
			return result;
		}
	}
}
