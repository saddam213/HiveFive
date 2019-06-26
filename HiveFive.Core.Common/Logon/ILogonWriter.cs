using System.Threading.Tasks;

namespace HiveFive.Core.Common.Logon
{
	public interface ILogonWriter
	{
		Task<bool> AddLogon(AddLogonModel model);
	}
}
