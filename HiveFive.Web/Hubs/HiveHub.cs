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
			ConnectionStore.LinkHandle(handle, Context.ConnectionId);

			await Subscribe($"@{handle}");
			await base.OnConnected();
			await SendPopularHives();
		}

		public override async Task OnReconnected()
		{
			var handle = GetUserHandle();
			ConnectionStore.LinkHandle(handle, Context.ConnectionId);

			await Subscribe($"@{handle}");
			await base.OnReconnected();
			await SendPopularHives();
		}

		public override async Task OnDisconnected(bool stopCalled)
		{
			var handle = ConnectionStore.GetHandle(Context.ConnectionId);
			ConnectionStore.UnlinkHandle(handle, Context.ConnectionId);

			await Unsubscribe($"@{handle}");
			await UnsubscribeAll();
			await base.OnDisconnected(stopCalled);
		}

		public async Task<List<string>> SendMessage(string message)
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
							Message = message,
						});
					}
					await Clients.Group(mention).OnMention(new
					{
						Sender = sender,
						Message = message,
					});

				}
				return GetHives();
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
						Hive = hive
					});
				}
			}
			return GetHives();
		}

		public async Task<List<string>> JoinHive(string hive)
		{
			var hiveName = hive.Trim().ToLower();
			if (!ValidateHiveName(hiveName))
			{
				await Clients.Caller.OnError("Invalid Hive name");
			}
			else
			{
				await Subscribe(hiveName);
			}
			return GetHives();
		}

		public async Task<List<string>> LeaveHive(string hive)
		{
			var hiveName = hive.Trim().ToLower();
			if (!ValidateHiveName(hiveName))
			{
				await Clients.Caller.OnError("Invalid Hive name");
			}
			else
			{
				await Unsubscribe(hiveName);
			}
			return GetHives();
		}



		private List<string> GetHives()
		{
			return ConnectionStore.GetHives(Context.ConnectionId).Keys
					.Where(x => x.StartsWith("#"))
					.ToList();
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
			if (!hive.StartsWith("#"))
				return;

			await Clients.All.OnHiveUpdate(new
			{
				Hive = hive,
				Count = ConnectionStore.GetHiveConnectionCount(hive),
				Total = ConnectionStore.GetConnectionCount()
			});
		}

		private async Task SendPopularHives()
		{
			await Clients.Caller.OnPopularHives(new
			{
				Hives = ConnectionStore.GetPopularHives(25),
				Total = ConnectionStore.GetConnectionCount()
			});
		}




		private static bool ValidateHiveName(string hiveName)
		{
			if (string.IsNullOrEmpty(hiveName))
				return false;
			if (hiveName.Length > 50)
				return false;
			if (!hiveName.StartsWith("#"))
				return false;
			return Regex.IsMatch(hiveName, @"^#\w+$");
		}

		private static HashSet<string> GetHives(string message)
		{
			var hives = new HashSet<string> { "#global" };
			foreach (Match item in Regex.Matches(message, @"(?<!\w)#\w+"))
			{
				hives.Add(item.Value.Trim().ToLower());
			}
			return hives;
		}

		private static HashSet<string> GetMentions(string message)
		{
			var mentions = new HashSet<string>();
			foreach (Match item in Regex.Matches(message, @"(?<!\w)@\w+"))
			{
				mentions.Add(item.Value);
			}
			return mentions;
		}

		private string GetUserHandle()
		{
			if (Context.User.Identity.IsAuthenticated)
			{
				return Context.Request.GetHttpContext().User.Identity.Name;
			}
			//return Context.ConnectionId;
			var ip = Context.Request.GetHttpContext().Request.GetIPAddress();
			var ipString = IPAddress.Parse(ip).ToUncompressedString();
			return string.Format("{0}", Math.Abs(ipString.GetHashCode()));
			//return string.Format("{0}", Math.Abs(Context.ConnectionId.GetHashCode()));
		}
	}
}