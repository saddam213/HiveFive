using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HiveFive.Data.Entity;

namespace HiveFive.Data.Common
{
	public interface IDataContext : IDisposable
	{
		Database Database { get; }
		int SaveChanges();
		Task<int> SaveChangesAsync();

		DbSet<User> Users { get; set; }
		DbSet<UserRole> UserRoles { get; set; }
		DbSet<UserInRole> UserInRoles { get; set; }
		DbSet<UserLogon> UserLogons { get; set; }

		DbSet<EmailTemplate> EmailTemplate { get; set; }
		DbSet<EmailOutbox> EmailOutbox { get; set; }
	}
}
