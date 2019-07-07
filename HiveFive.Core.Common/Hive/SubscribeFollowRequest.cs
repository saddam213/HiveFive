using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HiveFive.Core.Common.Hive
{
	public class SyncRequestMessage
	{
		public int MaxCount { get; set; }
		public long CacheTime { get; set; }
	}

	public class SyncReponseMessage
	{
		public string SyncId { get; set; }
		public List<string> Candidates { get; set; }
	}

	public class OnSyncRequestMessage
	{
		public string UserId { get; set; }
		public string SyncId { get; set; }
		public int MaxCount { get; set; }
		public long CacheTime { get; set; }
	}

	public class SyncResponseMessage
	{
		public string UserId { get; set; }
		public string SyncId { get; set; }
		public List<HiveMessage> Messages { get; set; }
	}

	public class OnSyncResponseMessage
	{
		public string UserId { get; set; }
		public string SyncId { get; set; }
		public List<HiveMessage> Messages { get; set; }
	}
}
