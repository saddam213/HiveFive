using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Configuration;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;
using HiveFive.Web.DI;
using HiveFive.Web.Hubs;

namespace HiveFive.Web
{
	public class MvcApplication : System.Web.HttpApplication
	{
		protected void Application_Start()
		{
			ServicePointManager.DefaultConnectionLimit = int.MaxValue;
			MvcHandler.DisableMvcResponseHeader = true;
			ViewEngines.Engines.Clear();
			ViewEngines.Engines.Add(new RazorViewEngine());

			DependencyRegistrar.Register();
			DependencyRegistrar.RegisterSingletonComponent<IHiveConnectionStore>(() => new HiveConnectionStore());
			DependencyRegistrar.RegisterSingletonComponent<IFollowerStore>(() => new FollowerStore());

			ModelMetadataProviders.Current = new CachedDataAnnotationsModelMetadataProvider();
			FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
			RouteConfig.RegisterRoutes(RouteTable.Routes);
			ResourceConfig.Init("HiveFive-User", WebConfigurationManager.AppSettings["Localization_EnabledLanguages"]);
		}

		protected void Application_End()
		{
			DependencyRegistrar.Deregister();
		}

		protected void Application_BeginRequest(object sender, EventArgs e)
		{
			ResourceConfig.InitRequest(Context);
		}

		protected void Application_Error(object sender, EventArgs e)
		{
			var exception = Server.GetLastError();
			var httpException = exception as HttpException;
			// As part of Bad Request errors can be "potentialy dangerous" requests which we can't route to .aspx.
			// Same exception would be thrown. So lets pass it to IIS which will present our static 400 custom err for us.
			if (httpException?.GetHttpCode() == 400)
			{
				Server.ClearError();
				Response.Clear();
				Response.StatusCode = 400;
			}
		}
	}
}
