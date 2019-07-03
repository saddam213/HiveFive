using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HiveFive.Core.Common.Throttle
{
	public interface IThrottleStore
	{
		Task<ThrottleResult> CheckThrottle(ThrottleAction action, string userHandle, bool isRegistered);
	}
}
