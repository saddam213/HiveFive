﻿using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(HiveFive.Web.Startup))]
namespace HiveFive.Web
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            ConfigureAuth(app);
        }
    }
}
