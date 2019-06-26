using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HiveFive.Core.Common.AccountSettings;
using HiveFive.Data.Common;

namespace HiveFive.Core.AccountSettings
{
	public class AccountSettingsReader : IAccountSettingsReader
	{
		public IDataContextFactory DataContextFactory { get; set; }

		public async Task<AccountSettingsModel> GetAccountSettings(int userId)
		{
			using (var context = DataContextFactory.CreateReadOnlyContext())
			{
				var user = await context.Users.FirstOrDefaultNoLockAsync(x => x.Id == userId);
				return new AccountSettingsModel
				{
					TwoFactorType = user.TwoFactorType
				};
			}
		}
	}
}
