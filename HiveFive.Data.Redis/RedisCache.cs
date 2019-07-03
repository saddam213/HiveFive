using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using StackExchange.Redis;

namespace HiveFive.Data.Redis
{
	public abstract class RedisCache
	{
		protected abstract ConnectionMultiplexer Connection { get; }

		public virtual IDatabase Database
		{
			get { return Connection.GetDatabase(); }
		}

		public virtual ISubscriber Subscriber
		{
			get { return Connection.GetSubscriber(); }
		}
	}
}
