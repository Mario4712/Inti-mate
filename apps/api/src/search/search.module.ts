import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { DiscoveryService } from "./discovery.service";
import { ElasticsearchService } from "./elasticsearch.service";

@Module({
  controllers: [SearchController],
  providers: [SearchService, DiscoveryService, ElasticsearchService],
  exports: [SearchService, ElasticsearchService],
})
export class SearchModule {}
