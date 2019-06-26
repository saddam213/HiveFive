using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Security.Claims;
using System.Threading.Tasks;
using HiveFive.Core.Common;
using HiveFive.Enums;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.EntityFramework;

namespace HiveFive.Web.Identity
{
	// You can add profile data for the user by adding more properties to your ApplicationUser class, please visit https://go.microsoft.com/fwlink/?LinkID=317594 to learn more.
	public class IdentityUser : IdentityUser<int, IdentityUserLogin, IdentityUserRole, IdentityUserClaim>
	{
		//IdentityUser Members
		//public Guid Id { get; set; }
		//public string UserName { get; set; }
		//public string Email { get; set; }
		//public bool EmailConfirmed { get; set; }
		//public string PasswordHash { get; set; }
		//public string SecurityStamp { get; set; }
		//public DateTime? LockoutEndDateUtc { get; set; }
		//public bool LockoutEnabled { get; set; }
		//public int AccessFailedCount { get; set; }

		[Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
		public override int Id { get; set; }

		public IdentityUser()
		{
			LockoutEnabled = true;
		}

		public TwoFactorType TwoFactorType { get; set; }

		[MaxLength(128)]
		public string TwoFactorPrivateKey { get; set; }

		[MaxLength(128)]
		public string TwoFactorPublicKey { get; set; }
		public string TwoFactorRecoveryCode { get; set; }

		public DateTime Registered { get; set; }
		public bool IsEnabled { get; set; }
		public string Culture { get; set; }
		public string Avatar { get; set; }

		public async Task<ClaimsIdentity> GenerateUserIdentityAsync(UserManager<IdentityUser, int> manager)
		{
			var userIdentity = await manager.CreateIdentityAsync(this, DefaultAuthenticationTypes.ApplicationCookie);
			//userIdentity.AddClaim(new Claim(ClaimTypes.ClientType, RequestClientType.WebV1.ToString()));
			return userIdentity;
		}
	}
}