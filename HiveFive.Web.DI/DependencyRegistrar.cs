using System;
using System.Web.Mvc;
using Castle.MicroKernel.Registration;
using Castle.Windsor;
using Castle.Windsor.Installer;
using HiveFive.Web.DI.Resolvers;
using Microsoft.AspNet.SignalR;

namespace HiveFive.Web.DI
{
	public static class DependencyRegistrar
	{
		private static IWindsorContainer _container;

		static DependencyRegistrar()
		{
			if (_container == null)
			{
				_container = BootstrapContainer();
			}
		}

		private static IWindsorContainer BootstrapContainer()
		{
			IWindsorContainer container = new WindsorContainer();
			container.Install(FromAssembly.This());
			return container;
		}

		public static void Register()
		{
			var projectxDependencyResolver = new WebsiteDependencyResolver(_container.Kernel);
			DependencyResolver.SetResolver(projectxDependencyResolver);
			GlobalHost.DependencyResolver = new SignalrDependencyResolver(_container.Kernel);
		}

		public static void Deregister()
		{
			_container.Dispose();
		}

		public static void RegisterTransientComponent<T>(Func<T> factoryCreate) where T : class
		{
			_container
				.Register(Component.For<T>()
					.UsingFactoryMethod(factoryCreate)
					.LifestyleTransient());
		}

		public static void RegisterSingletonComponent<T>(Func<T> factoryCreate) where T : class
		{
			_container
				.Register(Component.For<T>()
					.UsingFactoryMethod(factoryCreate)
					.LifestyleSingleton());
		}

		public static T Resolve<T>()
		{
			return _container.Resolve<T>();
		}

		public static IWindsorContainer Container
		{
			get { return _container; }
		}
	}
}
