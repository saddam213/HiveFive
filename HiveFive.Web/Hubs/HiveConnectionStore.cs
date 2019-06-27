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

		public async Task<IEnumerable<string>> UnlinkAllHives(IGroupManager groups, string connectionId)
		{
			if(ConnectionToHiveMap.TryRemove(connectionId, out var hives))
			{
				foreach (var hive in hives)
				{
					await groups.Remove(connectionId, hive);
				}
				return hives.CloneKeys();
			}
			return Enumerable.Empty<string>();
		}

		public Task<IEnumerable<string>> GetHives(string connectionId)
		{
			if (ConnectionToHiveMap.TryGetValue(connectionId, out var result))
				return Task.FromResult(result.CloneKeys());
			return Task.FromResult(Enumerable.Empty<string>());
		}

		public Task<int> GetConnectionCount()
		{
			return Task.FromResult(ConnectionToHiveMap.Count);
		}

		public Task<int> GetHiveConnectionCount(string hiveName)
		{
			return Task.FromResult(ConnectionToHiveMap
				.SelectMany(x => x.Value.Keys)
				.Where(x => x == hiveName)
				.Count());
		}

		public Task<IEnumerable<object>> GetPopularHives(int count)
		{
			return Task.FromResult<IEnumerable<object>>(ConnectionToHiveMap
				.SelectMany(x => x.Value.Keys)
				.GroupBy(x => x)
				.OrderByDescending(x => x.Count())
				.Take(count)
				.Select(hive => new
				{
					Hive = hive.Key,
					Count = hive.Count(),
				}));
		}


		public Task<string> GetHandle(string connectionId)
		{
			foreach (var item in HandleToConnectionMap)
			{
				if (item.Value.ContainsKey(connectionId))
					return Task.FromResult(item.Key);
			}
			return Task.FromResult(string.Empty);
		}

		public Task<IEnumerable<string>> GetConnections(string handle)
		{
			if (HandleToConnectionMap.TryGetValue(handle, out var result))
				return Task.FromResult(result.CloneKeys());
			return Task.FromResult(Enumerable.Empty<string>());
		}

		public Task LinkHandle(string handle, string connectionId)
		{
			HandleToConnectionMap.GetOrAdd(handle, new ConcurrentList<string>(connectionId)).Add(connectionId);
			return Task.FromResult(0);
		}

		public Task UnlinkHandle(string handle, string connectionId)
		{
			if (HandleToConnectionMap.TryGetValue(handle, out var result))
			{
				result.Remove(connectionId);
			}
			return Task.FromResult(0);
		}

		public Task<int> GetHandleCount()
		{
			return Task.FromResult(HandleToConnectionMap.Count);
		}
	}
}