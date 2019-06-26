using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using Microsoft.AspNet.SignalR;

namespace HiveFive.Web.Hubs
{
	public class HiveHub : Hub
	{
		public override async Task OnConnected()
		{
			await base.OnConnected();
			await Clients.Caller.OnConnect();
		}
	}
}