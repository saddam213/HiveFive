using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNet.SignalR;

namespace HiveFive.Web.Hubs
{
	public interface IHiveConnectionStore
	{
		Task<int> GetHandleCount();
		Task<string> GetHandle(string connectionId);
		Task<IEnumerable<string>> GetConnections(string handle);
		Task LinkHandle(string handle, string connectionId);
		Task UnlinkHandle(string handle, string connectionId);

		Task<int> GetConnectionCount();
		Task<int> GetHiveConnectionCount(string hiveName);
		Task<IEnumerable<string>> GetHives(string connectionId);
		Task<IEnumerable<object>> GetPopularHives(int count);
		Task LinkHive(IGroupManager groups, string connectionId, string hiveName);
		Task UnlinkHive(IGroupManager groups, string connectionId, string hiveName);
		Task<IEnumerable<string>> UnlinkAllHives(IGroupManager groups, string connectionId);
		


	}
}