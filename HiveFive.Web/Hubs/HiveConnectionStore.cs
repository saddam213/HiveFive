using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HiveFive.Framework.Objects;
using Microsoft.AspNet.SignalR;

namespace HiveFive.Web.Hubs
{
	public class HiveConnectionStore : IHiveConnectionStore
	{
		private static readonly ConcurrentDictionary<string, ConcurrentList<string>> HandleToConnectionMap = new ConcurrentDictionary<string, ConcurrentList<string>>();
		private static readonly ConcurrentDictionary<string, ConcurrentList<string>> ConnectionToHiveMap = new ConcurrentDictionary<string, ConcurrentList<string>>();


		public Task LinkHive(IGroupManager groups, string connectionId, string hiveName)
		{
			ConnectionToHiveMap.GetOrAdd(connectionId, new ConcurrentList<string>(hiveName)).Add(hiveName);
			return groups.Add(connectionId, hiveName);
		}

		public Task UnlinkHive(IGroupManager groups, string connectionId, string hiveName)
		{
			if (ConnectionToHiveMap.TryGetValue(connectionId, out var result))
			{
				result.Remove(hiveName);
			}
			return groups.Remove(connectionId, hiveName);
		}

		public async Task<List<string>> UnlinkAllHives(IGroupManager groups, string connectionId)
		{
			if(ConnectionToHiveMap.TryRemove(connectionId, out var hives))
			{
				foreach (var hive in hives)
				{
					await groups.Remove(connectionId, hive);
				}
				return new List<string>(hives.Keys);
			}
			return new List<string>();
		}

		public ConcurrentList<string> GetHives(string connectionId)
		{
			return ConnectionToHiveMap.TryGetValue(connectionId, out var result) ? result : new ConcurrentList<string>();
		}

		public int GetConnectionCount()
		{
			return ConnectionToHiveMap.Count;
		}

		public int GetHiveConnectionCount(string hiveName)
		{
			return ConnectionToHiveMap
				.SelectMany(x => x.Value.Keys)
				.Where(x => x == hiveName)
				.Count();
		}

		public IEnumerable<object> GetPopularHives(int count)
		{
			return ConnectionToHiveMap
				.SelectMany(x => x.Value.Keys)
				.Where(x => x.StartsWith("#"))
				.GroupBy(x => x)
				.OrderByDescending(x => x.Count())
				.Take(count)
				.Select(hive => new
				{
					Hive = hive.Key,
					Count = hive.Count(),
				});
		}


		public string GetHandle(string connectionId)
		{
			foreach (var item in HandleToConnectionMap)
			{
				if (item.Value.ContainsKey(connectionId))
					return item.Key;
			}
			return string.Empty;
		}

		public ConcurrentList<string> GetConnections(string handle)
		{
			return HandleToConnectionMap.TryGetValue(handle, out var result) ? result : new ConcurrentList<string>();
		}

		public bool LinkHandle(string handle, string connectionId)
		{
			return HandleToConnectionMap.GetOrAdd(handle, new ConcurrentList<string>(connectionId)).Add(connectionId);
		}

		public bool UnlinkHandle(string handle, string connectionId)
		{
			if (HandleToConnectionMap.TryGetValue(handle, out var result))
			{
				result.Remove(connectionId);
			}
			return true;
		}

		public int GetHandleCount()
		{
			return HandleToConnectionMap.Count;
		}
	}
}