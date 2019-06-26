using System;
using HiveFive.Web.Hubs;
using HiveFive.Web.Identity;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.Owin;
using Microsoft.AspNet.SignalR;
using Microsoft.Owin;
using Microsoft.Owin.Security.Cookies;
using Owin;

namespace HiveFive.Web
{
	public partial class Startup
	{
		// For more information on configuring authentication, please visit https://go.microsoft.com/fwlink/?LinkId=301864
		public void ConfigureAuth(IAppBuilder app)
		{
			// Configure the db context, user manager and signin manager to use a single instance per request
			app.CreatePerOwinContext(IdentityDataContext.Create);
			app.CreatePerOwinContext<IdentityUserManager>(IdentityUserManager.Create);

			// Enable the application to use a cookie to store information for the signed in user
			// and to use a cookie to temporarily store information about a user logging in with a third party login provider
			// Configure the sign in cookie
			app.UseCookieAuthentication(new CookieAuthenticationOptions
			{
				AuthenticationType = DefaultAuthenticationTypes.ApplicationCookie,
			
				Provider = new CookieAuthenticationProvider
				{
					// Enables the application to validate the security stamp when the user logs in.
					// This is a security feature which is used when you change a password or add an external login to your account.  
					OnValidateIdentity = SecurityStampValidator.OnValidateIdentity<IdentityUserManager, IdentityUser, int>
					(TimeSpan.FromSeconds(5), (manager, user) => user.GenerateUserIdentityAsync(manager), (id) => id.GetId())
				},
#if !DEBUG
				CookieSecure = CookieSecureOption.Always,
#endif
				CookieName = "HiveFive",
				LoginPath = new PathString("/Account/Login"),
				LogoutPath = new PathString("/Account/LogOut"),
			});

			// Enables the application to temporarily store user information when they are verifying the second factor in the two-factor authentication process.
			app.UseTwoFactorSignInCookie(DefaultAuthenticationTypes.TwoFactorCookie, TimeSpan.FromMinutes(5));


			// Signalr
			var hubConfiguration = new HubConfiguration
			{
#if DEBUG
				EnableDetailedErrors = true,
#else
				EnableDetailedErrors = false
#endif
			};
			GlobalHost.DependencyResolver.Register(typeof(IUserIdProvider), () => new HubIdentityProvider());
			app.MapSignalR(hubConfiguration);
		}
	}
}