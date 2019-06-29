using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using HiveFive.Framework.Extensions;
using HiveFive.Web.Extensions;
using Microsoft.AspNet.SignalR;

namespace HiveFive.Web.Hubs
{
	public class HiveHub : Hub
	{
		public IHiveConnectionStore ConnectionStore { get; set; }

		public override async Task OnConnected()
		{
			var handle = GetUserHandle();
			await ConnectionStore.LinkHandle(handle, Context.ConnectionId);

			await base.OnConnected();
			await SendTrendingList();
		}

		public override async Task OnReconnected()
		{
			var handle = GetUserHandle();
			await ConnectionStore.LinkHandle(handle, Context.ConnectionId);

			await base.OnReconnected();
			await SendTrendingList();
		}

		public override async Task OnDisconnected(bool stopCalled)
		{
			var handle = await ConnectionStore.GetHandle(Context.ConnectionId);
			await ConnectionStore.UnlinkHandle(handle, Context.ConnectionId);

			await UnsubscribeAll();
			await base.OnDisconnected(stopCalled);
		}

		public async Task<bool> SendMessage(string message, string hiveTargets)
		{
			var sender = GetUserHandle();
			var mentions = GetMentions(message);
			var hives = GetHives(message, hiveTargets);
			var timestamp = DateTime.UtcNow.ToJavaTime();
			var messageId = GetMessageId(sender, message, timestamp);
			foreach (var hive in hives)
			{
				await Clients.Group(hive).OnMessage(new
				{
					Id = messageId,
					Sender = sender,
					Message = message,
					Hive = hive,
					Hives = hives,
					Timestamp = timestamp
				});
			}

			foreach (var mention in mentions)
			{
				await Clients.User(mention).OnMention(new
				{
					Id = messageId,
					Sender = sender,
					Receiver = mention,
					Message = message,
					Hives = hives,
					Timestamp = timestamp
				});
			}
			return true;
		}

		//public async Task<bool> SendPrivateMessage(string message, string userTargets)
		//{
		//	var sender = GetUserHandle();
		//	var mentions = GetMentions(sender, userTargets);
		//	if (!mentions.Any())
		//	{
		//		await Clients.Caller.OnError("No user specified");
		//		return false;
		//	}


		//	foreach (var mention in mentions)
		//	{
		//		await Clients.User(mention).OnMention(new
		//		{
		//			Sender = sender,
		//			Receiver = mention,
		//			Message = message,
		//			Timestamp = DateTime.UtcNow
		//		});
		//	}
		//	return true;
		//}


		public async Task<bool> JoinHive(string hive)
		{
			var hiveName = GetHiveName(hive, true);
			if (string.IsNullOrEmpty(hiveName))
			{
				await Clients.Caller.OnError("Invalid Hive name");
				return false;
			}
			await Subscribe(hiveName);
			return true;
		}

		public async Task<bool> LeaveHive(string hive)
		{
			var hiveName = GetHiveName(hive, true);
			if (string.IsNullOrEmpty(hiveName))
			{
				await Clients.Caller.OnError("Invalid Hive name");
				return false;
			}
			await Unsubscribe(hiveName);
			return true;
		}

		private async Task Subscribe(string hive)
		{
			await ConnectionStore.LinkHive(Groups, Context.ConnectionId, hive);
			await SendHiveUpdate(hive);
		}

		private async Task Unsubscribe(string hive)
		{
			await ConnectionStore.UnlinkHive(Groups, Context.ConnectionId, hive);
			await SendHiveUpdate(hive);
		}

		private async Task UnsubscribeAll()
		{
			foreach (var hive in await ConnectionStore.UnlinkAllHives(Groups, Context.ConnectionId))
			{
				await SendHiveUpdate(hive);
			}
		}

		private async Task SendHiveUpdate(string hive)
		{
			await Clients.All.OnHiveUpdate(new
			{
				Hive = hive,
				Count = await ConnectionStore.GetHiveConnectionCount(hive),
				Total = await ConnectionStore.GetConnectionCount()
			});
		}

		private async Task SendTrendingList()
		{
			await Clients.Caller.OnTrending(new
			{
				User = GetUserHandle(),
				Hives = await ConnectionStore.GetPopularHives(15),
				Total = await ConnectionStore.GetConnectionCount()
			});
		}


		private static string GetHiveName(string hive, bool regex)
		{
			if (!ValidateHiveName(hive, regex))
				return string.Empty;

			return hive.TrimStart('#').Trim().ToLower();
		}



		private static bool ValidateHiveName(string hiveName, bool regex)
		{
			if (string.IsNullOrEmpty(hiveName))
				return false;
			if (hiveName.Length > 15)
				return false;
			if (!regex)
				return true;

			return Regex.IsMatch(hiveName, @"^\w+$");
		}

		private static IEnumerable<string> GetHives(string message, string hiveTargets)
		{
			var hives = new HashSet<string> { "global" };

			if (!string.IsNullOrEmpty(hiveTargets))
			{
				foreach (var item in hiveTargets.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries))
				{
					var hiveName = GetHiveName(item, true);
					if (string.IsNullOrEmpty(hiveName))
						continue;
					hives.Add(hiveName);
				}
			}


			if (message.Contains("#"))
			{
				foreach (Match item in Regex.Matches(message, @"(?<!\w)#\w+"))
				{
					var hiveName = GetHiveName(item.Value, false);
					if (string.IsNullOrEmpty(hiveName))
						continue;
					hives.Add(hiveName);
				}
			}

			return hives.Take(15);
		}

		private static IEnumerable<string> GetMentions(string message)
		{
			var mentions = new HashSet<string> { };
			if (!string.IsNullOrEmpty(message))
			{
				foreach (Match item in Regex.Matches(message, @"(?<!\w)@\w+"))
				{
					mentions.Add(item.Value.TrimStart('@'));
				}
			}
			return mentions.Take(15);
		}

		private string GetUserHandle()
		{
			if (Context.User.Identity.IsAuthenticated)
			{
				return Context.Request.GetHttpContext().User.Identity.Name;
			}
			return Context.Request.GetHttpContext().Request.GetIPAddressUser();
		}

		private static string GetMessageId(string username, string message, long timestamp)
		{
			return Math.Abs($"{username}|{timestamp}|{message}".GetHashCode()).ToString();
		}
	}
}