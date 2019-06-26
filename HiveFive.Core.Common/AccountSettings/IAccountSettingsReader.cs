using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HiveFive.Core.Common.AccountSettings
{
	public interface IAccountSettingsReader
	{
		Task<AccountSettingsModel> GetAccountSettings(int userId);
	}
}
