using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNet.SignalR;

namespace HiveFive.Web.Hubs
{
	public interface IHiveConnectionStore
	{
		Task<int> GetHandleCount();
		Task<int> GetHiveHandleCount(string hiveName);
		Task<string> GetHandle(string connectionId);
		Task LinkHandle(string handle, string connectionId);
		Task UnlinkHandle(string handle, string connectionId);

		Task<int> GetConnectionCount();
		Task<int> GetHiveConnectionCount(string hiveName);
		Task<IEnumerable<string>> GetHives(string userHandle);
		Task<IEnumerable<string>> GetHiveUsers(string hiveName);
		Task<IEnumerable<string>> GetHiveUsers(IEnumerable<string> hiveNames);
		Task<IEnumerable<object>> GetPopularHives(int count);

		Task LinkHive(string userHandle, string connectionId, string hiveName);
		Task UnlinkHive(string userHandle, string connectionId, string hiveName);
		Task<IEnumerable<string>> UnlinkAllHives(string userHandle, string connectionId);
		


	}
}