using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
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
			await SendPopularHives();
		}

		public override async Task OnReconnected()
		{
			var handle = GetUserHandle();
			await ConnectionStore.LinkHandle(handle, Context.ConnectionId);

			await base.OnReconnected();
			await SendPopularHives();
		}

		public override async Task OnDisconnected(bool stopCalled)
		{
			var handle = await ConnectionStore.GetHandle(Context.ConnectionId);
			await ConnectionStore.UnlinkHandle(handle, Context.ConnectionId);

			await UnsubscribeAll();
			await base.OnDisconnected(stopCalled);
		}

		public async Task<bool> SendMessage(string message)
		{
			var sender = GetUserHandle();
			var mentions = GetMentions(message);
			if (mentions.Any())
			{
				foreach (var mention in mentions)
				{
					if (!sender.Equals(mention))
					{
						await Clients.Caller.OnMention(new
						{
							Sender = sender,
							Receiver = mention,
							Message = message,
							Timestamp = DateTime.UtcNow
						});
					}
					await Clients.User(mention).OnMention(new
					{
						Sender = sender,
						Receiver = mention,
						Message = message,
						Timestamp = DateTime.UtcNow
					});
				}
				return true;
			}

			var hives = GetHives(message);
			if (hives.Any())
			{
				foreach (var hive in hives)
				{
					await Clients.Group(hive).OnMessage(new
					{
						Sender = sender,
						Message = message,
						Hive = hive,
						Timestamp = DateTime.UtcNow
					});
				}
			}
			return true;
		}

		public async Task<bool> JoinHive(string hive)
		{
			var hiveName = GetHiveName(hive);
			if (!ValidateHiveName(hiveName))
			{
				await Clients.Caller.OnError("Invalid Hive name");
				return false;
			}
			await Subscribe(hiveName);
			return true;
		}

		public async Task<bool> LeaveHive(string hive)
		{
			var hiveName = GetHiveName(hive);
			if (!ValidateHiveName(hiveName))
			{
				await Clients.Caller.OnError("Invalid Hive name");
				return false;
			}
			await Unsubscribe(hiveName);
			return true;
		}



		private Task<IEnumerable<string>> GetHives()
		{
			return ConnectionStore.GetHives(Context.ConnectionId);
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

		private async Task SendPopularHives()
		{
			await Clients.Caller.OnPopularHives(new
			{
				Hives = await ConnectionStore.GetPopularHives(25),
				Total = await ConnectionStore.GetConnectionCount()
			});
		}


		private static string GetHiveName(string hive)
		{
			if (string.IsNullOrEmpty(hive))
				return string.Empty;

			return hive.TrimStart('#').Trim().ToLower();
		}



		private static bool ValidateHiveName(string hiveName)
		{
			if (string.IsNullOrEmpty(hiveName))
				return false;
			if (hiveName.Length > 50)
				return false;
			return Regex.IsMatch(hiveName, @"^\w+$");
		}

		private static HashSet<string> GetHives(string message)
		{
			var hives = new HashSet<string> { "global" };
			foreach (Match item in Regex.Matches(message, @"(?<!\w)#\w+"))
			{
				var hiveName = GetHiveName(item.Value);
				if (string.IsNullOrEmpty(hiveName))
					continue;

				hives.Add(hiveName);
			}
			return hives;
		}

		private static HashSet<string> GetMentions(string message)
		{
			var mentions = new HashSet<string>();
			foreach (Match item in Regex.Matches(message, @"(?<!\w)@\w+"))
			{
				mentions.Add(item.Value.TrimStart('@'));
			}
			return mentions;
		}

		private string GetUserHandle()
		{
			if (Context.User.Identity.IsAuthenticated)
			{
				return Context.Request.GetHttpContext().User.Identity.Name;
			}
			return Context.Request.GetHttpContext().Request.GetIPAddressUser();
		}
	}
}