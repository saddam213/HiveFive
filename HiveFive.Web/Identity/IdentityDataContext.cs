using System.Data.Entity;
using System.Data.Entity.ModelConfiguration.Conventions;
using System.Diagnostics;
using Microsoft.AspNet.Identity.EntityFramework;

namespace HiveFive.Web.Identity
{
	public class IdentityDataContext : IdentityDbContext<IdentityUser, IdentityRole, int, IdentityUserLogin, IdentityUserRole, IdentityUserClaim>
	{
		public IdentityDataContext() : base("DefaultConnection")
		{
			Database.Log = e => Debug.WriteLine(e);
		}

		protected override void OnModelCreating(DbModelBuilder modelBuilder)
		{
			base.OnModelCreating(modelBuilder);
			modelBuilder.Conventions.Remove<PluralizingTableNameConvention>();


			modelBuilder.Entity<IdentityUser>().ToTable("Users")
			 .Ignore(c => c.PhoneNumber)
			 .Ignore(c => c.PhoneNumberConfirmed)
			 .Ignore(c => c.TwoFactorEnabled);
			 //.Ignore(u => u.Claims)
			 //.Ignore(u => u.Logins);
			modelBuilder.Entity<IdentityRole>().ToTable("UserRoles");
			modelBuilder.Entity<IdentityUserRole>().ToTable("UserInRoles").HasKey(r => new { r.RoleId, r.UserId });//.HasRequired(p => p.User);
			modelBuilder.Entity<IdentityUserRole>().ToTable("UserInRoles");//.HasRequired(p => p.Role);
			modelBuilder.Entity<IdentityUserClaim>().ToTable("UserClaims");
			modelBuilder.Entity<IdentityUserLogin>().ToTable("UserExternalLogon");

			modelBuilder.Entity<IdentityUser>().Property(u => u.Email).HasMaxLength(128);
			modelBuilder.Entity<IdentityUser>().Property(u => u.UserName).HasMaxLength(50);
			modelBuilder.Entity<IdentityUser>().Property(u => u.PasswordHash).HasMaxLength(256);
			modelBuilder.Entity<IdentityUser>().Property(u => u.SecurityStamp).HasMaxLength(50);
		}

		public static IdentityDataContext Create()
		{
			return new IdentityDataContext { RequireUniqueEmail = true };
		}
	}
}