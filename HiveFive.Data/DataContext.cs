using System.Data.Entity;
using System.Data.Entity.ModelConfiguration.Conventions;
using System.Diagnostics;
using HiveFive.Data.Common;
using HiveFive.Data.Entity;

namespace HiveFive.Data
{
	public class DataContext : DbContext, IDataContext
	{
		public DataContext()
			: base(ConnectionString.DefaultConnection)
		{
			Database.Log = (e) => Debug.WriteLine(e);
		}
		public DbSet<User> Users { get; set; }
		public DbSet<UserRole> UserRoles { get; set; }
		public DbSet<UserInRole> UserInRoles { get; set; }
		public DbSet<UserLogon> UserLogons { get; set; }
		public DbSet<EmailTemplate> EmailTemplate { get; set; }
		public DbSet<EmailOutbox> EmailOutbox { get; set; }

		protected override void OnModelCreating(DbModelBuilder modelBuilder)
		{
			base.OnModelCreating(modelBuilder);

			modelBuilder.Conventions.Remove<DecimalPropertyConvention>();
			modelBuilder.Conventions.Remove<PluralizingTableNameConvention>();
			modelBuilder.Conventions.Add(new DecimalPropertyConvention(38, 8));

			modelBuilder.Entity<User>().ToTable("Users");
			modelBuilder.Entity<UserRole>().ToTable("UserRoles");
			modelBuilder.Entity<UserInRole>().ToTable("UserInRoles").HasKey(r => new { r.RoleId, r.UserId }).HasRequired(p => p.User);
			modelBuilder.Entity<UserInRole>().ToTable("UserInRoles").HasRequired(p => p.Role);
			modelBuilder.Entity<UserLogon>().HasRequired(x => x.User).WithMany(x => x.Logons);
		}
	}
}
