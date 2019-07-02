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
		private static readonly ConcurrentDictionary<string, ConcurrentList<string>> HandleToHiveMap = new ConcurrentDictionary<string, ConcurrentList<string>>();

		public Task<int> GetCount()
		{
			return Task.FromResult(HandleToHiveMap.Count);
		}

		public Task<int> GetCount(string hive)
		{
			return Task.FromResult(HandleToHiveMap
				.SelectMany(x => x.Value.Keys)
				.Where(x => x == hive)
				.Count());
		}

		public Task<string> GetHandle(string connection)
		{
			foreach (var item in HandleToConnectionMap)
			{
				if (item.Value.ContainsKey(connection))
					return Task.FromResult(item.Key);
			}
			return Task.FromResult(string.Empty);
		}

		public Task LinkHandle(string handle, string connection)
		{
			return Task.FromResult(HandleToConnectionMap
				.GetOrAdd(handle, new ConcurrentList<string>(connection))
				.Add(connection));
		}

		public Task<IEnumerable<string>> UnlinkHandle(string handle, string connection)
		{
			if (HandleToConnectionMap.TryGetValue(handle, out var result))
			{
				if (result.Remove(connection) && result.IsEmpty)
				{
					HandleToConnectionMap.TryRemove(handle, out _);
					if (HandleToHiveMap.TryRemove(handle, out var hives))
					{
						return Task.FromResult(hives.CloneKeys());
					}
				}
			}
			return Task.FromResult(Enumerable.Empty<string>());
		}

		public Task LinkHive(string handle, string hive)
		{
			return Task.FromResult(HandleToHiveMap
				.GetOrAdd(handle, new ConcurrentList<string>(hive))
				.Add(hive));
		}

		public Task UnlinkHive(string handle, string hive)
		{
			if (HandleToHiveMap.TryGetValue(handle, out var handleResult))
			{
				handleResult.Remove(hive);
			}
			return Task.FromResult(0);
		}

		public Task<IEnumerable<object>> GetPopularHives(int count)
		{
			return Task.FromResult<IEnumerable<object>>(HandleToHiveMap
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

		public Task<IEnumerable<string>> GetHiveUsers(IEnumerable<string> hives)
		{
			var results = new List<string>();
			foreach (var hive in hives)
			{
				results.AddRange(HandleToHiveMap
				.Where(x => x.Value.ContainsKey(hive))
				.Select(x => x.Key));
			}
			return Task.FromResult(results.Distinct());
		}
	}
}