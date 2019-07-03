using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HiveFive.Core.Common;
using HiveFive.Core.Common.Throttle;
using HiveFive.Data.Redis;

namespace HiveFive.Core.Throttle
{
	public class ThrottleStore : IThrottleStore
	{
		private static readonly TimeSpan ThrottleMinute = TimeSpan.FromMinutes(1);
		public IRedisThrottleCache ThrottleCache { get; set; }

		private static Dictionary<ThrottleAction, int> ThrottleCountRegistered = new Dictionary<ThrottleAction, int>
		{
			{ThrottleAction.SendMessage, 25 },
			{ThrottleAction.JoinHive, 120 },
			{ThrottleAction.LeaveHive, 120 },
			{ThrottleAction.SubscribeHives, 120 },
			{ThrottleAction.SubscribeFollowers, 120 },
			{ThrottleAction.FollowUser, 120 },
			{ThrottleAction.UnfollowUser, 120 },
			{ThrottleAction.GetTrending, 120 },
		};

		private static Dictionary<ThrottleAction, int> ThrottleCountUnregistered = new Dictionary<ThrottleAction, int>
		{
			{ThrottleAction.SendMessage, 5 },
			{ThrottleAction.JoinHive, 20 },
			{ThrottleAction.LeaveHive, 20 },
			{ThrottleAction.SubscribeHives, 20 },
			{ThrottleAction.SubscribeFollowers, 20 },
			{ThrottleAction.FollowUser, 20 },
			{ThrottleAction.UnfollowUser, 20 },
			{ThrottleAction.GetTrending, 20 },
		};

		public async Task<ThrottleResult> CheckThrottle(ThrottleAction action, string userHandle, bool isRegistered)
		{
			int maxCalls = GetMaxCalls(action, isRegistered);
			if (await ThrottleCache.Increment($"{action}:{userHandle}", ThrottleMinute, maxCalls))
				return new ThrottleResult(false);

			return new ThrottleResult(true, $"Rate limit triggered, maximum {maxCalls} calls per minute");
		}

		private static int GetMaxCalls(ThrottleAction action, bool isRegistered)
		{
			return isRegistered
					? ThrottleCountRegistered[action]
					: ThrottleCountUnregistered[action];
		}
	}
}
