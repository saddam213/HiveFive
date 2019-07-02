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
			var hivesToUnsubscribe = await ConnectionStore.UnlinkHandle(handle, Context.ConnectionId);
			await UnsubscribeAll(handle, hivesToUnsubscribe);
			await base.OnDisconnected(stopCalled);
		}


		public async Task<bool> SendMessage(string message, string hiveTargets)
		{
			var sender = GetUserHandle();
			var timestamp = DateTime.UtcNow.ToJavaTime();
			var hives = HiveValidation.GetHives(message, hiveTargets);
			var messageId = HiveValidation.GetMessageId(sender, message, timestamp);

			var hivers = await ConnectionStore.GetHiveUsers(hives);
			var mentions = HiveValidation.GetMentions(message);
			var followers = await GetFollowers(sender);
			var messages = new Dictionary<string, HiveMessage>();

			// Messages to users in hives
			if (!hivers.IsNullOrEmpty())
			{
				foreach (var userHandle in hivers)
				{
					if (messages.ContainsKey(userHandle))
						continue;

					messages.Add(userHandle, new HiveMessage
					{
						Id = messageId,
						Sender = sender,
						Receiver = userHandle,
						Message = message,
						Timestamp = timestamp,
						Hives = new HashSet<string>(hives),
						MessageType = new HashSet<string> { "Feed" }
					});
				}
			}

			// Messages to users mentioned in message
			if (!mentions.IsNullOrEmpty())
			{
				foreach (var userHandle in mentions)
				{
					if (messages.ContainsKey(userHandle))
					{
						messages[userHandle].MessageType.Add("Mention");
						continue;
					}

					messages.Add(userHandle, new HiveMessage
					{
						Id = messageId,
						Sender = sender,
						Receiver = userHandle,
						Message = message,
						Timestamp = timestamp,
						Hives = new HashSet<string>(hives),
						MessageType = new HashSet<string> { "Mention" }
					});
				}
			}

			// Messages to anyone following the sender
			if (!followers.IsNullOrEmpty())
			{
				foreach (var userHandle in followers)
				{
					if (messages.ContainsKey(userHandle))
					{
						messages[userHandle].MessageType.Add("Follow");
						continue;
					}

					messages.Add(userHandle, new HiveMessage
					{
						Id = messageId,
						Sender = sender,
						Receiver = userHandle,
						Message = message,
						Timestamp = timestamp,
						Hives = new HashSet<string>(hives),
						MessageType = new HashSet<string> { "Follow" }
					});
				}
			}

			foreach (var item in messages)
			{
				await Clients.User(item.Key).OnMessage(item.Value);
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
			var handle = GetUserHandle();
			var results = new List<string>();
			if (hives.IsNullOrEmpty())
				return results;

			foreach (var hive in hives)
			{
				var hiveName = HiveValidation.GetHiveName(hive, true);
				if (string.IsNullOrEmpty(hiveName))
					continue;

				await Subscribe(handle, hiveName);
				results.Add(hiveName);
			}
			return results;
		}

		public async Task<bool> JoinHive(string hive)
		{
			var handle = GetUserHandle();
			var hiveName = HiveValidation.GetHiveName(hive, true);
			if (string.IsNullOrEmpty(hiveName))
			{
				await Clients.Caller.OnError("Invalid Hive name");
				return false;
			}
			await Subscribe(handle, hiveName);
			return true;
		}

		public async Task<bool> LeaveHive(string hive)
		{
			var handle = GetUserHandle();
			var hiveName = HiveValidation.GetHiveName(hive, true);
			if (string.IsNullOrEmpty(hiveName))
			{
				await Clients.Caller.OnError("Invalid Hive name");
				return false;
			}
			await Unsubscribe(handle, hiveName);
			return true;
		}

		public Task<IEnumerable<object>> GetTrending()
		{
			return ConnectionStore.GetPopularHives(15);
		}





		private async Task Subscribe(string userHandle, string hive)
		{
			await ConnectionStore.LinkHive(userHandle, hive);
			await SendHiveUpdate(hive);
		}

		private async Task Unsubscribe(string userHandle, string hive)
		{
			await ConnectionStore.UnlinkHive(userHandle, hive);
			await SendHiveUpdate(hive);
		}

		private async Task UnsubscribeAll(string userHandle, IEnumerable<string> hives)
		{
			foreach (var hive in hives)
			{
				await SendHiveUpdate(hive);
			}
		}

		private async Task SendHiveUpdate(string hive)
		{
			await Clients.All.OnHiveUpdate(new
			{
				Hive = hive,
				Count = await ConnectionStore.GetHiveHandleCount(hive),
				Total = await ConnectionStore.GetHandleCount()
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

	internal class HiveMessage
	{
		public string Id { get; set; }
		public string Sender { get; set; }
		public string Receiver { get; set; }
		public string Message { get; set; }
		public long Timestamp { get; set; }
		public HashSet<string> Hives { get; set; } = new HashSet<string>();
		public HashSet<string> MessageType { get; set; } = new HashSet<string>();
	}
}