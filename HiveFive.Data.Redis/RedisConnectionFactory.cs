using System;
using System.Configuration;
using StackExchange.Redis;

namespace HiveFive.Data.Redis
{
	public class RedisConnectionFactory
	{
		private static readonly Lazy<ConnectionMultiplexer> CacheConnection;

		static RedisConnectionFactory()
		{
			CacheConnection = new Lazy<ConnectionMultiplexer>(() => ConnectionMultiplexer.Connect(GetOptions(ConfigurationManager.AppSettings["RedisConnection_Cache"])));
		}

		public static ConnectionMultiplexer GetCacheConnection()
		{
			return CacheConnection.Value;
		}

		private static ConfigurationOptions GetOptions(string connectionString)
		{
			var options = ConfigurationOptions.Parse(connectionString);
			options.AbortOnConnectFail = false;
			options.KeepAlive = 30;
			options.ConnectTimeout = 500;
			options.SyncTimeout = 500;
			options.ConnectRetry = 10;
			options.AllowAdmin = true;
			return options;
		}
	}
}
