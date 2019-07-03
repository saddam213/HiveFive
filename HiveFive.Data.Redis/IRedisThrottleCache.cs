using System;
using System.Threading.Tasks;

namespace HiveFive.Data.Redis
{
	public interface IRedisThrottleCache
	{
		Task<bool> Increment(string userHandle, TimeSpan period, long maxCalls);
	}
}
