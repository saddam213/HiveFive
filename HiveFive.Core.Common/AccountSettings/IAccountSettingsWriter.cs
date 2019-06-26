using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HiveFive.Core.Common.AccountSettings
{
	public interface IAccountSettingsWriter
	{
		Task<bool> UpdateLanguage(int userId, string culture);
	}
}
