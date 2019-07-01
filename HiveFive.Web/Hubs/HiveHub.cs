using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Web;
using HiveFive.Framework.Extensions;
using HiveFive.Framework.Objects;
using HiveFive.Web.Extensions;
using Microsoft.AspNet.SignalR;

namespace HiveFive.Web.Hubs
{
	public class HiveHub : Hub
	{
		public IFollowerStore FollowerStore { get; set; }
		public IHiveConnectionStore ConnectionStore { get; set; }

		public override async Task OnConnected()
		{
			var handle = GetUserHandle();
			await ConnectionStore.LinkHandle(handle, Context.ConnectionId);
			await base.OnConnected();
		}

		public override async Task OnReconnected()
		{
			var handle = GetUserHandle();
			await ConnectionStore.LinkHandle(handle, Context.ConnectionId);
			await base.OnReconnected();
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
			var mentions = HiveValidation.GetMentions(message);
			var hives = HiveValidation.GetHives(message, hiveTargets);
			var followers = await GetFollowers(sender);
			var timestamp = DateTime.UtcNow.ToJavaTime();
			var messageId = HiveValidation.GetMessageId(sender, message, timestamp);
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

			foreach (var follower in followers)
			{
				await Clients.User(follower).OnFollow(new
				{
					Id = messageId,
					Sender = sender,
					Receiver = follower,
					Message = message,
					Hives = hives,
					Timestamp = timestamp
				});
			}
			return true;
		}

		public async Task<object> SubscribeFollowers(List<string> followers)
		{
			var handle = GetUserHandle();
			var following = await FollowerStore.GetFollowers(handle);

			if (followers.IsNullOrEmpty())
				return new
				{
					Followers = following,
					Following = new List<string>()
				};

			var result = new List<string>();
			foreach (var follower in followers.Select(x => x.Trim()).Distinct())
			{
				if (!HiveValidation.ValidateUserHandle(follower))
					continue;

				await FollowerStore.FollowHandle(handle, follower);
				result.Add(follower);
			}

			if (!result.IsNullOrEmpty())
			{
				await Clients.Users(result).OnFollowUpdate(new
				{
					Action = "Add",
					UserHandle = handle
				});
			}

			return new
			{
				Followers = following,
				Following = result
			}; 
		}

		public async Task<bool> FollowUser(string userToFollow)
		{
			if (!HiveValidation.ValidateUserHandle(userToFollow))
			{
				await Clients.Caller.OnError("Invalid name");
				return false;
			}

			var handle = GetUserHandle();
			await FollowerStore.FollowHandle(handle, userToFollow);
			await Clients.User(userToFollow).OnFollowUpdate(new
			{
				Action = "Add",
				UserHandle = handle
			});
			return true;
		}

		public async Task<bool> UnfollowUser(string userToUnfollow)
		{
			if (!HiveValidation.ValidateUserHandle(userToUnfollow))
			{
				await Clients.Caller.OnError("Invalid name");
				return false;
			}

			var handle = GetUserHandle();
			await FollowerStore.UnfollowHandle(handle, userToUnfollow);
			await Clients.User(userToUnfollow).OnFollowUpdate(new
			{
				Action = "Remove",
				UserHandle = handle
			});
			return true;
		}

		public async Task<List<string>> SubscribeHives(List<string> hives)
		{
			var results = new List<string>();
			if (hives.IsNullOrEmpty())
				return results;

			foreach (var hive in hives)
			{
				var hiveName = HiveValidation.GetHiveName(hive, true);
				if (string.IsNullOrEmpty(hiveName))
					continue;

				await Subscribe(hiveName);
				results.Add(hiveName);
			}
			return results;
		}

		public async Task<bool> JoinHive(string hive)
		{
			var hiveName = HiveValidation.GetHiveName(hive, true);
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
			var hiveName = HiveValidation.GetHiveName(hive, true);
			if (string.IsNullOrEmpty(hiveName))
			{
				await Clients.Caller.OnError("Invalid Hive name");
				return false;
			}
			await Unsubscribe(hiveName);
			return true;
		}

		public Task<IEnumerable<object>> GetTrending()
		{
			return ConnectionStore.GetPopularHives(15);
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

		private Task<IEnumerable<string>> GetFollowers(string userHandle)
		{
			return FollowerStore.GetFollowers(userHandle);
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