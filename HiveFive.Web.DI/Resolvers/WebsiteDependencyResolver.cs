using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;

namespace HiveFive.Web.DI.Resolvers
{
	public class WebsiteDependencyResolver : IDependencyResolver
	{
		private readonly Castle.MicroKernel.IKernel _kernal;
		public WebsiteDependencyResolver(Castle.MicroKernel.IKernel kernal)
		{
			_kernal = kernal;
		}

		public object GetService(Type serviceType)
		{
			return _kernal.HasComponent(serviceType) ? _kernal.Resolve(serviceType) : null;
		}

		public IEnumerable<object> GetServices(Type serviceType)
		{
			return _kernal.ResolveAll(serviceType).Cast<object>();
		}
	}
}
