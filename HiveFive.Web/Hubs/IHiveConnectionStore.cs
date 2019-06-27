using System.Collections.Generic;
using System.Threading.Tasks;
using HiveFive.Framework.Objects;
using Microsoft.AspNet.SignalR;

namespace HiveFive.Web.Hubs
{
	public interface IHiveConnectionStore
	{
		int GetConnectionCount();
		ConcurrentList<string> GetConnections(string handle);
		string GetHandle(string connectionId);
		int GetHandleCount();
		int GetHiveConnectionCount(string hiveName);
		ConcurrentList<string> GetHives(string connectionId);
		IEnumerable<object> GetPopularHives(int count);
		bool LinkHandle(string handle, string connectionId);
		Task LinkHive(IGroupManager groups, string connectionId, string hiveName);
		Task<List<string>> UnlinkAllHives(IGroupManager groups, string connectionId);
		bool UnlinkHandle(string handle, string connectionId);
		Task UnlinkHive(IGroupManager groups, string connectionId, string hiveName);
	}
}