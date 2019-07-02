using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HiveFive.Framework.Objects;

namespace HiveFive.Web.Hubs
{
	public class HiveConnectionStore : IHiveConnectionStore
	{
		private static readonly ConcurrentDictionary<string, ConcurrentList<string>> HandleToConnectionMap = new ConcurrentDictionary<string, ConcurrentList<string>>();
		private static readonly ConcurrentDictionary<string, ConcurrentList<string>> ConnectionToHiveMap = new ConcurrentDictionary<string, ConcurrentList<string>>();
		private static readonly ConcurrentDictionary<string, ConcurrentList<string>> HandleToHiveMap = new ConcurrentDictionary<string, ConcurrentList<string>>();

		public Task LinkHive(string userHandle, string connectionId, string hiveName)
		{
			HandleToHiveMap.GetOrAdd(userHandle, new ConcurrentList<string>(hiveName)).Add(hiveName);
			ConnectionToHiveMap.GetOrAdd(connectionId, new ConcurrentList<string>(hiveName)).Add(hiveName);
			return Task.FromResult(0);
		}

		public Task UnlinkHive(string userHandle, string connectionId, string hiveName)
		{
			if (HandleToHiveMap.TryGetValue(userHandle, out var handleResult))
			{
				handleResult.Remove(hiveName);
			}
			if (ConnectionToHiveMap.TryGetValue(connectionId, out var connectionResult))
			{
				connectionResult.Remove(hiveName);
			}
			return Task.FromResult(0);
		}

		public Task<IEnumerable<string>> UnlinkAllHives(string userHandle, string connectionId)
		{
			var hives = new List<string>();
			if (HandleToHiveMap.TryGetValue(userHandle, out var handleResult))
			{
				hives.AddRange(handleResult.Keys);
			}
			if (ConnectionToHiveMap.TryGetValue(connectionId, out var connectionResult))
			{
				hives.AddRange(handleResult.Keys);
			}
			return Task.FromResult(hives.Distinct());
		}

		public Task<IEnumerable<string>> GetHives(string userHandle)
		{
			if (HandleToHiveMap.TryGetValue(userHandle, out var result))
				return Task.FromResult(result.CloneKeys());
			return Task.FromResult(Enumerable.Empty<string>());
		}

		public Task<IEnumerable<string>> GetHiveUsers(string hiveName)
		{
			return Task.FromResult(HandleToHiveMap.Where(x => x.Value.ContainsKey(hiveName)).Select(x => x.Key).Distinct() ?? Enumerable.Empty<string>());
		}

		public Task<IEnumerable<string>> GetHiveUsers(IEnumerable<string> hiveNames)
		{
			var results = new List<string>();
			foreach (var hiveName in hiveNames)
			{
				results.AddRange(HandleToHiveMap.Where(x => x.Value.ContainsKey(hiveName)).Select(x => x.Key));
			}
			return Task.FromResult(results.Distinct());
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

		//public Task<IEnumerable<string>> GetConnections(string handle)
		//{
		//	if (HandleToConnectionMap.TryGetValue(handle, out var result))
		//		return Task.FromResult(result.CloneKeys());
		//	return Task.FromResult(Enumerable.Empty<string>());
		//}

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

		public Task<int> GetHiveHandleCount(string hiveName)
		{
			return Task.FromResult(HandleToHiveMap
				.SelectMany(x => x.Value.Keys)
				.Where(x => x == hiveName)
				.Count());
		}

	}
}