using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using StackExchange.Redis;

namespace HiveFive.Data.Redis
{
	public class RedisThrottleCache : RedisCache, IRedisThrottleCache
	{
		protected override ConnectionMultiplexer Connection
		{
			get { return RedisConnectionFactory.GetCacheConnection(); }
		}

		public async Task<bool> Increment(string key, TimeSpan period, long maxCalls)
		{
			try
			{
				if (!Connection.IsConnected)
					return false;

				var throttleKey = $"Throttle:{key}:{(int)period.TotalSeconds}";
				if (!await Database.KeyExistsAsync(throttleKey))
				{
					await Database.StringIncrementAsync(throttleKey, 0);
					await Database.KeyExpireAsync(throttleKey, period);
					return true;
				}

				var callCount = await Database.StringIncrementAsync(throttleKey);
				return callCount < maxCalls;
			}
			catch (Exception)
			{
				return false;
			}
		}
	}
}
