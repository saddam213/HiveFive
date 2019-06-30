using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HiveFive.Framework.Objects;

namespace HiveFive.Web.Hubs
{
	public interface IFollowerStore
	{
		Task FollowHandle(string userHandle, string userToFollow);
		Task UnfollowHandle(string userHandle, string userToUnfollow);
		Task<IEnumerable<string>> GetFollowers(string userHandle);
		Task<IEnumerable<string>> GetFollowing(string userHandle);
	}

	public class FollowerStore : IFollowerStore
	{
		private static readonly ConcurrentDictionary<string, ConcurrentList<string>> HandleToFollower = new ConcurrentDictionary<string, ConcurrentList<string>>();

		public Task FollowHandle(string userHandle, string userToFollow)
		{
			HandleToFollower.GetOrAdd(userToFollow, new ConcurrentList<string>(userHandle)).Add(userHandle);
			return Task.FromResult(0);
		}

		public Task UnfollowHandle(string userHandle, string userToUnfollow)
		{
			if (HandleToFollower.TryGetValue(userToUnfollow, out var result))
			{
				result.Remove(userHandle);
			}
			return Task.FromResult(0);
		}

		public Task<IEnumerable<string>> GetFollowers(string userHandle)
		{
			if (HandleToFollower.TryGetValue(userHandle, out var result))
				return Task.FromResult(result.CloneKeys());
			return Task.FromResult(Enumerable.Empty<string>());
		}

		public Task<IEnumerable<string>> GetFollowing(string userHandle)
		{
			return Task.FromResult(HandleToFollower.Where(x => x.Value.ContainsKey(userHandle)).Select(x => x.Key) ?? Enumerable.Empty<string>());
		}
	}
}
