using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using HiveFive.Web.Identity;
using Microsoft.AspNet.SignalR;

namespace HiveFive.Web.Hubs
{
	public class HubIdentityProvider : IUserIdProvider
	{
		public string GetUserId(IRequest request)
		{
			if (request.User != null && request.User.Identity.IsAuthenticated)
			{
				return request.User.Identity.GetId().ToString();
			}
			return "0";
		}
	}
}