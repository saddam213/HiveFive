using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HiveFive.Core.Common.AccountSettings;
using HiveFive.Data.Common;

namespace HiveFive.Core.AccountSettings
{
	public class AccountSettingsWriter : IAccountSettingsWriter
	{
		public IDataContextFactory DataContextFactory { get; set; }

		public async Task<bool> UpdateLanguage(int userId, string culture)
		{
			if (string.IsNullOrEmpty(culture))
				return false;

			using (var context = DataContextFactory.CreateContext())
			{
				var user = await context.Users.FirstOrDefaultNoLockAsync(x => x.Id == userId);
				if (user == null)
					return false;

				user.Culture = culture;
				await context.SaveChangesAsync();
				return true;
			}
		}
	}
}
